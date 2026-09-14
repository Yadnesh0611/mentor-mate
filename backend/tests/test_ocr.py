import os
import pytest
from PIL import Image, ImageDraw
import pymupdf
from app.services.extraction_service import document_extractor, DocumentExtractor

def test_ocr_on_standalone_image(tmp_path):
    """Verifies real OCR extraction on standalone image file (PNG/JPG)."""
    img_path = str(tmp_path / "test_notes.png")
    
    # Render synthetic lecture note image
    img = Image.new("RGB", (700, 200), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((30, 40), "MAXWELL EQUATION: GAUSS LAW FOR MAGNETISM", fill=(0, 0, 0))
    d.text((30, 90), "div B = 0 indicating no magnetic monopoles exist.", fill=(0, 0, 0))
    d.text((30, 140), "Magnetic field lines always form closed continuous loops.", fill=(0, 0, 0))
    img.save(img_path)

    sections = document_extractor.extract(img_path, "png")
    assert len(sections) > 0
    sec = sections[0]
    assert sec.is_ocr is True
    text = sec.content.upper()
    print("Extracted Standalone Image Text:\n", text)
    assert "MAXWELL" in text or "MAGNET" in text or "LAW" in text

def test_ocr_on_scanned_pdf(tmp_path):
    """Verifies that a scanned PDF with 0 digital text is rendered & transcribed via OCR."""
    pdf_path = str(tmp_path / "scanned_lecture.pdf")
    
    # Create image containing academic notes
    img = Image.new("RGB", (800, 500), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((40, 50), "THERMODYNAMICS CHAPTER 3", fill=(0, 0, 0))
    d.text((40, 110), "Entropy S = k * ln(Omega) Boltzmann Equation", fill=(0, 0, 0))
    d.text((40, 170), "Second Law: Total entropy of an isolated system always increases.", fill=(0, 0, 0))
    temp_img_path = str(tmp_path / "temp_page.png")
    img.save(temp_img_path)

    # Insert image into PDF as a pure bitmap scan (zero digital text stream)
    doc = pymupdf.open()
    page = doc.new_page(width=800, height=500)
    page.insert_image(page.rect, filename=temp_img_path)
    doc.save(pdf_path)
    doc.close()

    # Verify zero digital text stream
    verify_doc = pymupdf.open(pdf_path)
    assert len(verify_doc[0].get_text().strip()) == 0
    verify_doc.close()

    # Now extract using document_extractor - it must detect scan & run OCR
    sections = document_extractor.extract(pdf_path, "pdf")
    assert len(sections) == 1
    sec = sections[0]
    assert sec.is_ocr is True
    assert "OCR" in sec.section_title
    text = sec.content.upper()
    print("Extracted Scanned PDF Text:\n", text)
    assert "THERMODYNAMICS" in text or "ENTROPY" in text or "BOLTZMANN" in text or "SYSTEM" in text

def test_digital_pdf_fallback_and_passthrough(tmp_path):
    """Verifies that standard digital PDFs retain exact text without unnecessary OCR overhead."""
    pdf_path = str(tmp_path / "digital_lecture.pdf")
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), "Quantum Mechanics: The particle in a 1D infinite potential well.")
    doc.save(pdf_path)
    doc.close()

    sections = document_extractor.extract(pdf_path, "pdf")
    assert len(sections) == 1
    assert sections[0].is_ocr is False
    assert "Quantum Mechanics" in sections[0].content

def test_image_preprocessing():
    """Verifies that low-res and RGBA images are normalized cleanly for OCR."""
    small_rgba = Image.new("RGBA", (100, 50), (255, 255, 255, 200))
    processed = DocumentExtractor.preprocess_image_for_ocr(small_rgba)
    assert processed.mode == "RGB"
    assert processed.size[0] >= 600
