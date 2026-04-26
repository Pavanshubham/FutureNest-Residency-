import cv2
import easyocr
import numpy as np
import re

# Initialize EasyOCR reader once
reader = easyocr.Reader(['en'], gpu=True) # Set gpu=False if no GPU is available

def preprocess_for_ocr(image):
    """
    Apply advanced preprocessing to improve OCR accuracy for number plates.
    """
    # 1. Upscale if the image is too small (helps EasyOCR detect text)
    img_h, img_w = image.shape[:2]
    if img_w < 400:
        image = cv2.resize(image, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)

    # 2. Grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # 3. Noise reduction while preserving edges
    bfilter = cv2.bilateralFilter(gray, 11, 17, 17) 
    
    # 4. Contrast adjustment (Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    contrast_img = clahe.apply(bfilter)
    
    # Return high-contrast grayscale. EasyOCR handles thresholding internally.
    # Harsh binarization often breaks character strokes.
    return contrast_img

def read_number_plate(image_path_or_np_array):
    """
    Read number plate from an image and return text with confidence.
    """
    if isinstance(image_path_or_np_array, str):
        img = cv2.imread(image_path_or_np_array)
    else:
        img = image_path_or_np_array

    if img is None:
        return None, 0.0

    # Preprocess image
    processed_img = preprocess_for_ocr(img)

    # Perform OCR with Allowlist (Crucial for Number Plate Accuracy)
    # This prevents EasyOCR from picking up random symbols like @, #, - etc.
    results = reader.readtext(processed_img, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
    
    if not results:
        # Fallback 1: Try Original Image without processing
        results = reader.readtext(img, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
        
    if not results:
        # Fallback 2: Try slightly blurred grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        results = reader.readtext(blur, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')

    def correct_ocr_mistakes(text):
        """Fix common OCR confusions based on typical Indian Number Plate format."""
        if len(text) < 8:
            return text
            
        char_to_num = {'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '4', 'A': '4', 'S': '5', 'G': '6', 'B': '8', 'Z': '2', 'T': '1'}
        num_to_char = {'0': 'O', '1': 'I', '2': 'Z', '4': 'A', '5': 'S', '6': 'G', '8': 'B'}
        
        chars = list(text)
        
        # State Code (First 2): Must be letters
        for i in range(2):
            if chars[i] in num_to_char: chars[i] = num_to_char[chars[i]]
                
        # RTO Code (Next 2): Must be numbers
        for i in range(2, min(4, len(chars))):
            if chars[i] in char_to_num: chars[i] = char_to_num[chars[i]]
                
        # Last 4: Must be numbers
        for i in range(max(4, len(chars)-4), len(chars)):
            if chars[i] in char_to_num: chars[i] = char_to_num[chars[i]]
                
        # Middle (Series): Must be letters
        for i in range(4, len(chars)-4):
            if chars[i] in num_to_char: chars[i] = num_to_char[chars[i]]
            # If the user specifically noted M is read as H in series, we might optionally replace it,
            # but H is a valid series letter. We will leave it unless it's a known impossible combo.

        # State Code specific fixes for 'M' read as 'H' (e.g. HH -> MH)
        state_code = "".join(chars[:2])
        valid_states = ["AP", "AR", "AS", "BR", "CG", "GA", "GJ", "HR", "HP", "JH", "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL", "OD", "PB", "RJ", "SK", "TN", "TS", "TR", "UP", "UK", "WB", "AN", "CH", "DN", "DD", "DL", "JK", "LA", "LD", "PY"]
        if state_code not in valid_states:
            if state_code[0] == 'H' and state_code[1] not in ['R', 'P']:
                chars[0] = 'M'  # E.g. HH -> MH, HL -> ML, HD -> MD(Invalid but M is better guess)
            if state_code == "HH":
                chars[0] = 'M'
            elif state_code == "NH":
                chars[0] = 'M'
            elif state_code == "WH":
                chars[0] = 'M'
            elif state_code == "HM":
                chars[0] = 'M'
                chars[1] = 'H'

        # Special fallback for M read as H anywhere if specifically requested and it makes sense
        # E.g. if the system is primarily Maharashtra (MH), we forcefully correct HH -> MH.
        
        return "".join(chars)

    if results:
        # EasyOCR might return multiple bounding boxes for a single plate (e.g. "MH 12" and "AB 1234")
        # We sort them left-to-right based on the x-coordinate of the bounding box
        sorted_by_x = sorted(results, key=lambda x: x[0][0][0])
        
        # Combine all text chunks into one continuous string
        combined_text = "".join([res[1].upper().replace(" ", "") for res in sorted_by_x])
        
        # We also want to keep track of the max confidence
        max_confidence = max([res[2] for res in results]) if results else 0.0

        # Regex for Indian Number Plates (e.g., MH12AB1234, DL1CAA1111, HR26EQ1234)
        # 2 Letters + 1/2 Numbers + 0/3 Letters + 4 Numbers
        indian_plate_regex = re.compile(r'^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$')
        
        # Check if the combined text matches the exact Indian number plate format
        if indian_plate_regex.match(combined_text):
            return combined_text, max_confidence
            
        # Attempt to correct common OCR mistakes (e.g., L instead of 4)
        corrected_text = correct_ocr_mistakes(combined_text)
        if indian_plate_regex.match(corrected_text):
            return corrected_text, max_confidence

        # If strict regex fails, fallback to cleaning up the most confident chunks
        # Sometimes it reads extra characters like state logos or IND marks
        for res in sorted(results, key=lambda x: x[2], reverse=True):
            text = res[1].upper().replace(" ", "")
            # Return any block that looks reasonably like a plate (at least 6 chars)
            if len(text) >= 6 and len(text) <= 10:
                return text, res[2]
                
        # If nothing matches, just return the combined text if it's long enough
        if len(combined_text) >= 4:
            return combined_text[:10], max_confidence
            
        return sorted_by_x[0][1].upper().replace(" ", ""), sorted_by_x[0][2]
    
    return "UNKNOWN", 0.0
