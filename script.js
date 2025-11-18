// ====================================================================
// IMAGE CONVERTER LOGIC (Canvas API with Blob URL) - Runs on index.html
// ====================================================================

function initImageConverter() {
    // 1. Element References
    const fileInput = document.getElementById('fileInput');
    const formatSelect = document.getElementById('formatSelect');
    const convertButton = document.getElementById('convertButton');
    const statusMessage = document.getElementById('statusMessage');
    const qualityInput = document.getElementById('qualityInput');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');

    // 2. Initial Status Check
    statusMessage.innerHTML = '✅ Ready';
    statusMessage.className = 'status-message success';
    convertButton.disabled = false;
    convertButton.textContent = 'Convert File';

    // 3. Event Listener
    convertButton.addEventListener('click', handleImageConversion);

    function handleImageConversion() {
        if (fileInput.files.length === 0) {
            statusMessage.innerHTML = '⚠️ Select a file';
            statusMessage.className = 'status-message error';
            return;
        }

        const selectedFile = fileInput.files[0];
        const targetMimeType = formatSelect.value;
        const targetExtension = targetMimeType.split('/')[1]?.replace('jpeg', 'jpg') || targetMimeType;
        
        const isConvertibleImage = selectedFile.type.startsWith('image/') || selectedFile.name.toLowerCase().endsWith('.svg');
        
        if (!isConvertibleImage) {
            statusMessage.innerHTML = '⚠️ Format unsupported';
            statusMessage.className = 'status-message error';
            return;
        }

        const quality = parseFloat(qualityInput.value) || 0.9;
        const targetWidth = parseInt(widthInput.value);
        const targetHeight = parseInt(heightInput.value);

        statusMessage.innerHTML = `⚙️ Converting`;
        statusMessage.className = 'status-message processing';
        convertButton.disabled = true;
        
        // --- PERFORMANCE FIX: Use ArrayBuffer/Blob URL instead of Data URL ---
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            const blob = new Blob([arrayBuffer], { type: selectedFile.type });
            const imageUrl = URL.createObjectURL(blob);
            
            const img = new Image();
            
            img.onload = () => {
                URL.revokeObjectURL(imageUrl); 
                
                try {
                    let newWidth = img.width;
                    let newHeight = img.height;
                    
                    // Resizing Logic
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

                    // Canvas Setup
                    const canvas = document.createElement('canvas');
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);

                    // Conversion and Download
                    canvas.toBlob((blob) => {
                        const downloadLink = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        
                        downloadLink.href = url;
                        downloadLink.download = `${selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || 'image'}.${targetExtension}`;
                        
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        
                        document.body.removeChild(downloadLink);
                        URL.revokeObjectURL(url);

                        statusMessage.innerHTML = `✅ Done`;
                        statusMessage.className = 'status-message success';
                        
                    }, targetMimeType, quality);

                } catch (e) {
                    console.error("Canvas Conversion Error:", e);
                    statusMessage.innerHTML = '❌ Could not convert file';
                    statusMessage.className = 'status-message error';
                } finally {
                    convertButton.disabled = false;
                }
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                statusMessage.innerHTML = '❌ Could not load file';
                statusMessage.className = 'status-message error';
                convertButton.disabled = false;
            };

            img.src = imageUrl;
        };

        reader.onerror = (error) => {
            console.error("FileReader Error:", error);
            statusMessage.innerHTML = '❌ Could not read file';
            statusMessage.className = 'status-message error';
            convertButton.disabled = false;
        };

        reader.readAsArrayBuffer(selectedFile);
    }
}
