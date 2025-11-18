document.addEventListener('DOMContentLoaded', () => {
    // Get references to the key HTML elements
    const fileInput = document.getElementById('fileInput');
    const formatSelect = document.getElementById('formatSelect');
    const qualityInput = document.getElementById('qualityInput');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const convertButton = document.getElementById('convertButton');
    const statusMessage = document.getElementById('statusMessage');

    convertButton.addEventListener('click', () => {
        
        if (fileInput.files.length === 0) {
        statusMessage.innerHTML = '⚠️ Please select a file first.';
        statusMessage.className = 'status-message error'; // Sets the class
            return;
        }

        const selectedFile = fileInput.files[0];
        const targetMimeType = formatSelect.value;
        // Adjusted to handle image/gif and placeholders
        const targetExtension = targetMimeType.split('/')[1]?.replace('jpeg', 'jpg') || targetMimeType.split('/')[1]?.split(';')[0];
        
        // --- NEW: Check if the file is an image OR an SVG ---
        const isConvertibleImage = selectedFile.type.startsWith('image/') || selectedFile.name.toLowerCase().endsWith('.svg');
        
        if (!isConvertibleImage) {
            statusMessage.innerHTML = '⚠️ Selected file is not a supported image format (PNG, JPEG, WebP, GIF, or SVG).';
            statusMessage.className = 'status-message error'; // Sets the class
            return;
        }
        // --- END NEW ---

        const quality = parseFloat(qualityInput.value) || 0.9;
        const targetWidth = parseInt(widthInput.value);
        const targetHeight = parseInt(heightInput.value);

        statusMessage.innerHTML = `⚙️ Converting **${selectedFile.name}** to **.${targetExtension}**...`;
        statusMessage.className = 'status-message processing'; // Sets the class
        convertButton.disabled = true;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // --- RESIZE CALCULATION (Same as before) ---
                    let newWidth = img.width;
                    let newHeight = img.height;
                    
                    if (targetWidth > 0 && targetHeight > 0) {
                        newWidth = targetWidth;
                        newHeight = targetHeight;
                    } else if (targetWidth > 0) {
                        newHeight = img.height * (targetWidth / img.width);
                        newWidth = targetWidth;
                    } else if (targetHeight > 0) {
                        newWidth = img.width * (targetHeight / img.height);
                        newHeight = targetHeight;
                    }
                    // --- END RESIZE CALCULATION ---

                    // 4. Create a temporary Canvas element
                    const canvas = document.createElement('canvas');
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);

                    // 6. Perform the conversion using toBlob()
                    canvas.toBlob((blob) => {
                        // ... (Download logic remains the same and reliable) ...
                        const originalFileName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
                        const newFileName = `${originalFileName}.${targetExtension}`;
                        
                        const downloadLink = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        
                        downloadLink.href = url;
                        downloadLink.download = newFileName;
                        
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        
                        document.body.removeChild(downloadLink);
                        URL.revokeObjectURL(url);

                        statusMessage.innerHTML = `✅ Conversion Complete! ...`;
                        statusMessage.className = 'status-message success'; // Sets the class
                        
                    }, targetMimeType, quality); // Pass the user-defined quality

                } catch (e) {
                    console.error("Canvas Conversion Error:", e);
                    statusMessage.innerHTML = '❌ Conversion failed during image processing.';
                    statusMessage.className = 'status-message error'; // Sets the class
                } finally {
                    convertButton.disabled = false;
                }
            };
            
            // Error handling for image loading
            img.onerror = () => {
                statusMessage.innerHTML = '❌ Error loading the image file. Ensure file is a valid image or SVG.';
                statusMessage.className = 'status-message error'; // Sets the class
                convertButton.disabled = false;
            };

            // Set the Image source to the data URL read by the FileReader
            img.src = event.target.result;
        };

        reader.onerror = (error) => {
            console.error("FileReader Error:", error);
            statusMessage.innerHTML = '❌ Error reading the file.';
            statusMessage.className = 'status-message error'; // Sets the class
            convertButton.disabled = false;
        };

        // Read the file as a Data URL
        reader.readAsDataURL(selectedFile);
    });
});
