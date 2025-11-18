// --- NEW, SIMPLER INITIALIZATION ---

// 1. Just declare FFmpeg globally. The script tag makes it available.
const FFmpegGlobal = FFmpeg; 

// 2. Access the required functions directly from the global object when creating the instance.
const ffmpeg = FFmpegGlobal.createFFmpeg({ 
    log: true,
    corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.7/dist/ffmpeg-core.js' 
});

// We'll update fetchFile access inside the conversion function later if needed, 
// but for now, this fixes the createFFmpeg error.
let ffmpegLoaded = false;

// Shared references
const statusMessage = document.getElementById('statusMessage');
const convertButtonAudio = document.getElementById('convertButtonAudio');
const audioToolContent = document.getElementById('audio-tool');
const imageConverterContent = document.getElementById('image-converter');


// Function to handle tab switching
function switchTab(targetTabId) {
    const contents = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-button');
    
    // Hide all content and deactivate all buttons
    contents.forEach(content => content.classList.add('hidden'));
    buttons.forEach(button => button.classList.remove('active'));

    // Show target content and activate target button
    document.getElementById(targetTabId).classList.remove('hidden');
    document.querySelector(`.tab-button[data-tab="${targetTabId}"]`).classList.add('active');

    // Special logic for Audio tool: Ensure FFmpeg is loaded
    if (targetTabId === 'audio-tool' && !ffmpegLoaded) {
        loadFFmpeg();
    }
}

// Function to load FFmpeg (called only when Audio tab is first accessed)
async function loadFFmpeg() {
    statusMessage.innerHTML = 'FFmpeg is loading... this may take a moment.';
    statusMessage.className = 'status-message processing';

    try {
        await ffmpeg.load();
        ffmpegLoaded = true;
        convertButtonAudio.disabled = false;
        convertButtonAudio.textContent = 'Process Audio File';
        statusMessage.innerHTML = '✅ FFmpeg ready. Select a file.';
        statusMessage.className = 'status-message success';
    } catch (e) {
        statusMessage.innerHTML = `❌ Failed to load FFmpeg. Cannot use Audio Tool.`;
        statusMessage.className = 'status-message error';
        console.error(e);
    }
}


// ==========================================
// 1. IMAGE CONVERTER LOGIC (Canvas API)
// ==========================================
function setupImageConverter() {
    const fileInput = document.getElementById('fileInputImage');
    const formatSelect = document.getElementById('formatSelectImage');
    const qualityInput = document.getElementById('qualityInputImage');
    const widthInput = document.getElementById('widthInputImage');
    const heightInput = document.getElementById('heightInputImage');
    const convertButton = document.getElementById('convertButtonImage');

    convertButton.addEventListener('click', () => {
        // Clear status when starting
        statusMessage.innerHTML = 'Ready to start.';
        statusMessage.className = 'status-message';

        // Validation... (same as before)
        if (fileInput.files.length === 0) {
            statusMessage.innerHTML = '⚠️ Please select an image file first.';
            statusMessage.className = 'status-message error';
            return;
        }

        // ... (The rest of the Canvas conversion logic remains the same, 
        // replacing the global variables with the local ones defined above, 
        // e.g., use 'fileInput.files[0]' instead of 'fileInputImage.files[0]')
        
        // --- START IMAGE CONVERSION LOGIC ---

        const selectedFile = fileInput.files[0];
        const targetMimeType = formatSelect.value;
        const targetExtension = targetMimeType.split('/')[1]?.replace('jpeg', 'jpg') || targetMimeType.split('/')[1]?.split(';')[0];
        
        const isConvertibleImage = selectedFile.type.startsWith('image/') || selectedFile.name.toLowerCase().endsWith('.svg');
        
        if (!isConvertibleImage) {
            statusMessage.innerHTML = '⚠️ Selected file is not a supported image format (PNG, JPEG, WebP, GIF, or SVG).';
            statusMessage.className = 'status-message error';
            return;
        }

        const quality = parseFloat(qualityInput.value) || 0.9;
        const targetWidth = parseInt(widthInput.value);
        const targetHeight = parseInt(heightInput.value);

        statusMessage.innerHTML = `⚙️ Converting **${selectedFile.name}** to **.${targetExtension}**...`;
        statusMessage.className = 'status-message processing';
        convertButton.disabled = true;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Calculate Resized Dimensions
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

                    // Create Canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);

                    // Perform the conversion using toBlob()
                    canvas.toBlob((blob) => {
                        const originalFileName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
                        const newFileName = `${originalFileName}.${targetExtension}`;
                        
                        // Download Logic
                        const downloadLink = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        downloadLink.href = url;
                        downloadLink.download = newFileName;
                        
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        
                        document.body.removeChild(downloadLink);
                        URL.revokeObjectURL(url);

                        statusMessage.innerHTML = `✅ Conversion Complete! **${newFileName}** (${Math.round(newWidth)}x${Math.round(newHeight)}) is downloading.`;
                        statusMessage.className = 'status-message success';
                        
                    }, targetMimeType, quality);

                } catch (e) {
                    console.error("Canvas Conversion Error:", e);
                    statusMessage.innerHTML = '❌ Conversion failed during image processing.';
                    statusMessage.className = 'status-message error';
                } finally {
                    convertButton.disabled = false;
                }
            };
            
            img.onerror = () => {
                statusMessage.innerHTML = '❌ Error loading the image file. Ensure file is a valid image or SVG.';
                statusMessage.className = 'status-message error';
                convertButton.disabled = false;
            };

            img.src = event.target.result;
        };

        reader.onerror = (error) => {
            console.error("FileReader Error:", error);
            statusMessage.innerHTML = '❌ Error reading the file.';
            statusMessage.className = 'status-message error';
            convertButton.disabled = false;
        };

        reader.readAsDataURL(selectedFile);
        
        // --- END IMAGE CONVERSION LOGIC ---
    });
}


// ==========================================
// 2. AUDIO TOOL LOGIC (FFmpeg Wasm)
// ==========================================
function setupAudioTool() {
    const fileInput = document.getElementById('fileInputAudio');
    const formatSelect = document.getElementById('formatSelectAudio');
    const bitrateInput = document.getElementById('bitrateInputAudio');
    const trimStartInput = document.getElementById('trimStartInputAudio');
    const trimEndInput = document.getElementById('trimEndInputAudio');

    // Set up a progress listener for Audio
    ffmpeg.setProgress(({ ratio }) => {
        if (ratio < 0) return;
        const percentage = Math.round(ratio * 100);
        statusMessage.innerHTML = `⚙️ Processing... ${percentage}%`;
        statusMessage.className = 'status-message processing';
    });


    convertButtonAudio.addEventListener('click', async () => {
        // Clear status when starting
        statusMessage.innerHTML = 'Ready to start.';
        statusMessage.className = 'status-message';
        
        if (!ffmpegLoaded) {
             statusMessage.innerHTML = '❌ FFmpeg is not loaded yet. Please wait.';
             statusMessage.className = 'status-message error';
             return;
        }

        if (fileInput.files.length === 0) {
            statusMessage.innerHTML = '⚠️ Please select an audio file first.';
            statusMessage.className = 'status-message error';
            return;
        }

        // ... (The rest of the FFmpeg logic remains the same, 
        // referencing the correct audio elements)

        // --- START AUDIO CONVERSION LOGIC ---
        const selectedFile = fileInput.files[0];
        const targetFormat = formatSelect.value;
        const inputFileName = selectedFile.name;
        const outputFileName = `converted.${targetFormat}`;
        
        const bitrate = bitrateInput.value.trim();
        const trimStart = trimStartInput.value.trim();
        const trimEnd = trimEndInput.value.trim();
        
        let command = [];

        if (trimStart) {
            command.push('-ss', trimStart);
        }
        if (trimEnd) {
            command.push('-to', trimEnd);
        }

        command.push('-i', inputFileName);

        if (bitrate) {
            command.push('-b:a', `${bitrate}k`);
        }
        
        command.push(outputFileName);


        statusMessage.innerHTML = `⚙️ Preparing **${inputFileName}** for processing...`;
        statusMessage.className = 'status-message processing';
        convertButtonAudio.disabled = true;

        try {
            ffmpeg.FS('writeFile', inputFileName, await fetchFile(selectedFile));

            console.log("FFmpeg Command:", command.join(' '));
            await ffmpeg.run(...command);
            
            const data = ffmpeg.FS('readFile', outputFileName);
            const blob = new Blob([data.buffer], { type: `audio/${targetFormat}` });

            // Download Logic
            const downloadLink = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            downloadLink.href = url;
            downloadLink.download = `${selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || 'audio'}-${targetFormat}.${targetFormat}`;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);

            statusMessage.innerHTML = `✅ Processing Complete! **${outputFileName}** is downloading.`;
            statusMessage.className = 'status-message success';
            
        } catch (e) {
            console.error("FFmpeg Processing Error:", e);
            statusMessage.innerHTML = '❌ Processing failed. Check console for details.';
            statusMessage.className = 'status-message error';
        } finally {
            try {
                ffmpeg.FS('unlink', inputFileName);
            } catch {}

            convertButtonAudio.disabled = false;
             // Restore success status only if no error occurred
             if (!statusMessage.className.includes('error')) {
                 statusMessage.innerHTML = '✅ FFmpeg ready. Select a file.';
                 statusMessage.className = 'status-message success';
            }
        }
        // --- END AUDIO CONVERSION LOGIC ---
    });
}


// ==========================================
// 3. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Tab Navigation Listeners
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // 2. Setup Converters
    setupImageConverter();
    setupAudioTool();
    
    // Initial load state: only FFmpeg for audio loads on first click
});
