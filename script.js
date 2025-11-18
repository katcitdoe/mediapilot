document.addEventListener('DOMContentLoaded', () => {
    // Get references to the key HTML elements
    const fileInput = document.getElementById('fileInput');
    const formatSelect = document.getElementById('formatSelect');
    const convertButton = document.getElementById('convertButton');
    const statusMessage = document.getElementById('statusMessage');

    convertButton.addEventListener('click', () => {
        // 1. Validation
        if (fileInput.files.length === 0) {
            statusMessage.innerHTML = '⚠️ Please select an image file first.';
            statusMessage.style.color = 'red';
            return;
        }

        const selectedFile = fileInput.files[0];
        const targetMimeType = formatSelect.value; // e.g., 'image/png'
        const targetExtension = targetMimeType.split('/')[1].replace('jpeg', 'jpg'); // Get extension like 'png' or 'jpg'
        
        // Ensure the selected file is an image (based on input accept="image/*")
        if (!selectedFile.type.startsWith('image/')) {
            statusMessage.innerHTML = '⚠️ Selected file is not an image.';
            statusMessage.style.color = 'red';
            return;
        }

        // 2. Set Status and Disable Button
        statusMessage.innerHTML = `⚙️ Converting **${selectedFile.name}** to **.${targetExtension}**...`;
        statusMessage.style.color = '#007bff';
        convertButton.disabled = true;
        
        // 3. Use FileReader to read the selected file
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // 4. Create a temporary Canvas element
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Get the 2D rendering context
                    const ctx = canvas.getContext('2d');
                    
                    // 5. Draw the image onto the canvas
                    ctx.drawImage(img, 0, 0);

                    // 6. Perform the conversion using toBlob()
                    canvas.toBlob((blob) => {
                        // Get the original file name without extension
                        const originalFileName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
                        const newFileName = `${originalFileName}.${targetExtension}`;
                        
                        // 7. Trigger the Download
                        const downloadLink = document.createElement('a');
                        downloadLink.href = URL.createObjectURL(blob); // Create temporary URL for download
                        downloadLink.download = newFileName; // Set the download filename
                        
                        // Wait briefly before triggering the click to ensure the element is ready
                        setTimeout(() => {
                            downloadLink.click();
                            // Clean up the temporary URL immediately after download is triggered
                            URL.revokeObjectURL(downloadLink.href);
                        }, 50);

                        // 8. Display Success Message
                        statusMessage.innerHTML = `✅ Conversion Complete! **${newFileName}** is downloading.`;
                        statusMessage.style.color = 'green';
                        
                    }, targetMimeType, 0.9); // The 0.9 is the JPEG quality parameter (ignored by PNG/WebP)

                } catch (e) {
                    console.error("Canvas Conversion Error:", e);
                    statusMessage.innerHTML = '❌ Conversion failed during image processing.';
                    statusMessage.style.color = 'darkred';
                } finally {
                    convertButton.disabled = false;
                }
            };
            img.onerror = () => {
                statusMessage.innerHTML = '❌ Error loading the image file.';
                statusMessage.style.color = 'darkred';
                convertButton.disabled = false;
            };
            // Set the Image source to the data URL read by the FileReader
            img.src = event.target.result;
        };

        reader.onerror = (error) => {
            console.error("FileReader Error:", error);
            statusMessage.innerHTML = '❌ Error reading the file.';
            statusMessage.style.color = 'darkred';
            convertButton.disabled = false;
        };

        // Read the file as a Data URL (base64 encoded string)
        reader.readAsDataURL(selectedFile);
    });
});
