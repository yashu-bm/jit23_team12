import os
from abc import ABC, abstractmethod
from dotenv import load_dotenv
import cohere

load_dotenv()


class LLMProvider(ABC):

    @abstractmethod
    def generate_content(self, prompt: str):
        pass


class CohereProvider(LLMProvider):

    def __init__(self):
        api_key = os.getenv("COHERE_API_KEY")

        if not api_key:
            raise Exception("COHERE_API_KEY not found in .env file")

        self.client = cohere.ClientV2(api_key=api_key)

    def generate_content(self, prompt: str):

        response = self.client.chat(
            model="command-a-03-2025",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )

        text = response.message.content[0].text

        # Remove markdown if Cohere returns ```json
        text = text.replace("```json", "")
        text = text.replace("```", "")
        text = text.strip()

        return text


def get_llm_provider():
    return CohereProvider()