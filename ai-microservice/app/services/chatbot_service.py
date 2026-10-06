from app.services.llm_provider import get_llm_provider


class ChatbotService:

    def __init__(self):
        self.llm_provider = get_llm_provider()

    def get_response(self, message: str, history=None, language="en"):
        """
        Generate a legal assistant response.

        :param message: The user's latest message.
        :param history: List of previous messages as dicts with 'role' and 'content'.
        :param language: Language code - 'en' (English), 'hi' (Hindi), 'kn' (Kannada).
                         The model auto-detects the language from the user's message
                         and replies in that language.
        """

        # Map language codes to natural language names for the prompt
        language_names = {
            "en": "English",
            "hi": "Hindi (Hindi)",
            "kn": "Kannada (Kannada)",
        }
        preferred_language = language_names.get(language, "English")

        # Build conversation history block
        history_block = ""
        if history:
            for msg in history:
                role_label = "User" if msg.get("role") == "user" else "Assistant"
                history_block += f"{role_label}: {msg.get('content', '')}\n"

        system_instructions = f"""You are a multilingual AI Legal Assistant specializing in Indian law.

LANGUAGE RULES (STRICTLY FOLLOW):
1. The user's preferred language selection is: {preferred_language}.
2. Detect the actual language of the user's current message automatically.
3. ALWAYS reply in the SAME language the user wrote in for their current message.
4. If the user writes in Kannada, reply entirely in Kannada.
5. If the user writes in Hindi, reply entirely in Hindi.
6. If the user writes in English, reply entirely in English.
7. If the user mixes languages (code-switching), reply in the dominant language of their message.
8. Do NOT mix languages in your response unless the user explicitly did so.
9. Preserve conversation context across all messages even when the language changes.

YOUR ROLE:
- Provide clear, accurate legal assistance.
- Explain legal documents, contracts, clauses, and terminology in simple terms.
- Offer general legal guidance on Indian law (IPC, CrPC, Civil law, Labour law,
  Consumer law, Family law, Property law, Contract law, etc.).
- Always add a brief legal disclaimer where appropriate.

DISCLAIMER (use the version matching your reply language):
English: "Disclaimer: This is general legal information and not formal legal advice. Please consult a qualified advocate for your specific situation."
Hindi: "Disclaimer: यह सामान्य कानूनी जानकारी है, औपचारिक कानूनी सलाह नहीं। कृपया अपनी विशेष स्थिति के लिए किसी योग्य अधिवक्ता से परामर्श करें।"
Kannada: "Disclaimer: ಇದು ಸಾಮಾನ್ಯ ಕಾನೂನು ಮಾಹಿತಿಯಾಗಿದೆ, ಔಪಚಾರಿಕ ಕಾನೂನು ಸಲಹೆಯಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ನಿರ್ದಿಷ್ಟ ಪರಿಸ್ಥಿತಿಗಾಗಿ ಅರ್ಹ ವಕೀಲರನ್ನು ಸಂಪರ್ಕಿಸಿ."
"""

        if history_block:
            prompt = f"""{system_instructions}

Conversation History:
{history_block}
User: {message}
Assistant:"""
        else:
            prompt = f"""{system_instructions}

User: {message}
Assistant:"""

        return self.llm_provider.generate_content(prompt)

    def summarize_document(self, document_text: str):

        prompt = f"""Summarize this legal document.

Mention:

1. Purpose
2. Parties involved
3. Important clauses
4. Important dates
5. Overall summary

Document:

{document_text[:25000]}
"""

        return self.llm_provider.generate_content(prompt)

    def answer_document_question(self, document_text: str, question: str):

        prompt = f"""Legal Document:

{document_text[:25000]}

Question:

{question}

Answer only using the document.
"""

        return self.llm_provider.generate_content(prompt)

    def extract_risky_clauses(self, document_text: str):

        prompt = f"""You are a legal expert.

Analyze the following legal document.

Return ONLY a JSON object.

Do NOT use markdown.

Do NOT write ```json.

Return exactly in this format:

{{
  "overall_risk":"Medium",
  "confidence_score":"0.92",
  "missing_clauses":["Termination", "Dispute Resolution", "Force Majeure"],
  "recommendations":["Add a termination clause allowing 30 days notice.", "Specify jurisdiction for disputes."],
  "ai_explanation":"A simple plain-language explanation of what this document is and its main implications.",
  "clauses":[
    {{
      "clause_type":"Termination",
      "clause_text":"The company may terminate this agreement at any time.",
      "risk_level":"High",
      "reason":"Company can terminate anytime without cause."
    }}
  ]
}}

Legal Document:

{document_text[:25000]}
"""

        response = self.llm_provider.generate_content(prompt)

        response = response.replace("```json", "")
        response = response.replace("```", "")
        response = response.strip()

        return response