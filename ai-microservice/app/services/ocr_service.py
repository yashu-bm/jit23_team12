import io
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes


class OCRService:

    def __init__(self):
        # Change this path if Tesseract is installed elsewhere
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    def extract_text_from_image(self, image_bytes: bytes):

        image = Image.open(io.BytesIO(image_bytes))

        text = pytesseract.image_to_string(image)

        return text

    def extract_text_from_pdf(self, pdf_bytes: bytes):

        images = convert_from_bytes(
            pdf_bytes,
            poppler_path=r"C:\Users\yashu\Downloads\Release-26.02.0-0 (1)\poppler-26.02.0\Library\bin"
        )

        text = ""

        for image in images:
            text += pytesseract.image_to_string(image)
            text += "\n"

        return text