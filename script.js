// ====================================================================
// UNIVERSAL INITIALIZATION AND PAGE CHECK
// ====================================================================

// Check if we are on the Audio page (using an ID unique to audio.html)
const isAudioPage = !!document.getElementById('bitrateInput'); 

document.addEventListener('DOMContentLoaded', async () => {
    if (isAudioPage) {
        // Run Audio Converter Logic
        await initAudioConverter();
    } else {
        // Run Image Converter Logic
        initImageConverter();
    }
});


// ====================================================================
// IMAGE CONVERTER LOGIC (Canvas API)
// ====================================================================

function initImageConverter() {
    // Image-specific element references
    const fileInput = document.getElementById('fileInput');
    const formatSelect = document.getElementById('formatSelect');
    const convertButton = document.getElementById('convertButton');
    const statusMessage = document.getElementById('statusMessage');
    const qualityInput = document.getElementById('qualityInput');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');

    convertButton.addEventListener('click', handleImageConversion);

    function handleImageConversion() {
        // 1. Validation
        if (fileInput.files.length === 0) {
            statusMessage.innerHTML = '⚠️ Please select a file first.';
            statusMessage.className = 'status-message error';
            return;
        }

        const selectedFile = fileInput.files[0];
        const targetMimeType = formatSelect.value;
        const targetExtension = targetMimeType.split('/')[1]?.replace('jpeg', 'jpg') || targetMimeType;
        
        const isConvertibleImage = selectedFile.type.startsWith('image/') || selectedFile.name.toLowerCase().endsWith('.svg');
        
        if (!isConvertibleImage) {
            statusMessage.innerHTML = '⚠️ Selected file is not a supported image format.';
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

                        statusMessage.innerHTML = `✅ Conversion Complete! **.${targetExtension}** (${Math.round(newWidth)}x${Math.round(newHeight)}) is downloading.`;
                        statusMessage.className = 'status-message success';
                        
                    }, targetMimeType, quality);

                } catch (e) {
                    console.error("Canvas Conversion Error:", e);
                    statusMessage.innerHTML = '❌ Image Conversion failed during processing.';
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

            reader.readAsDataURL(selectedFile);
        };

        reader.onerror = (error) => {
            console.error("FileReader Error:", error);
            statusMessage.innerHTML = '❌ Error reading the file.';
            statusMessage.className = 'status-message error';
            convertButton.disabled = false;
        };

        reader.readAsDataURL(selectedFile);
    }
}


// ====================================================================
// AUDIO CONVERTER LOGIC (FFmpeg Wasm)
// ====================================================================

async function initAudioConverter() {
    // Audio-specific element references
    const fileInput = document.getElementById('fileInput');
    const formatSelect = document.getElementById('formatSelect');
    const bitrateInput = document.getElementById('bitrateInput');
    const trimStartInput = document.getElementById('trimStartInput');
    const trimEndInput = document.getElementById('trimEndInput');
    const convertButton = document.getElementById('convertButton');
    const statusMessage = document.getElementById('statusMessage');

    // FFmpeg setup variables (Access via global FFmpeg object from the CDN link)
    const FFmpegGlobal = FFmpeg;
    const { createFFmpeg, fetchFile } = FFmpegGlobal;
    
    // Initialize the ffmpeg instance
    const ffmpeg = createFFmpeg({ 
        log: true,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.7/dist/ffmpeg-core.js' 
    });

    // 1. Load FFmpeg Core
    try {
        await ffmpeg.load();
        convertButton.disabled = false;
        convertButton.textContent = 'Process Audio File';
        statusMessage.innerHTML = '✅ FFmpeg ready. Select a file.';
        statusMessage.className = 'status-message success';
    } catch (e) {
        statusMessage.innerHTML = `❌ Failed to load FFmpeg. Check console.`;
        statusMessage.className = 'status-message error';
        console.error("FFmpeg Load Error:", e);
    }
    
    // Set up a progress listener
    ffmpeg.setProgress(({ ratio }) => {
        if (ratio < 0) return;
        const percentage = Math.round(ratio * 100);
        statusMessage.innerHTML = `⚙️ Processing... ${percentage}%`;
        statusMessage.className = 'status-message processing';
    });


    // 2. Main Conversion Logic
    convertButton.addEventListener('click', async () => {
        if (fileInput.files.length === 0) {
            statusMessage.innerHTML = '⚠️ Please select an audio file first.';
            statusMessage.className = 'status-message error';
            return;
        }

        const selectedFile = fileInput.files[0];
        const targetFormat = formatSelect.value;
        const inputFileName = selectedFile.name;
        const outputFileName = `converted.${targetFormat}`;
        
        // --- Read User Controls ---
        const bitrate = bitrateInput.value.trim();
        const trimStart = trimStartInput.value.trim();
        const trimEnd = trimEndInput.value.trim();
        
        // --- Build FFmpeg Command Array ---
        let command = [];

        // 1. Trimming options (must come BEFORE input file for faster processing)
        if (trimStart) {
            command.push('-ss', trimStart);
        }
        if (trimEnd) {
            command.push('-to', trimEnd);
        }

        // 2. Input file
        command.push('-i', inputFileName);

        // 3. Compression (Bitrate) option
        if (bitrate) {
            command.push('-b:a', `${bitrate}k`);
        }
        
        // 4. Output file
        command.push(outputFileName);


        statusMessage.innerHTML = `⚙️ Preparing **${inputFileName}** for processing...`;
        statusMessage.className = 'status-message processing';
        convertButton.disabled = true;

        try {
            // Write the file to the FFmpeg virtual file system
            ffmpeg.FS('writeFile', inputFileName, await fetchFile(selectedFile));

            // Execute the FFmpeg command
            console.log("FFmpeg Command:", command.join(' '));
            await ffmpeg.run(...command);
            
            // Read the output file from the virtual file system
            const data = ffmpeg.FS('readFile', outputFileName);
            
            // Create a Blob for the download
            const blob = new Blob([data.buffer], { type: `audio/${targetFormat}` });

            // Trigger the Download
            const downloadLink = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            downloadLink.href = url;
            downloadLink.download = `${selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || 'audio'}-${targetFormat}.${targetFormat}`;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);

            statusMessage.innerHTML = `✅ Processing Complete! **${downloadLink.download}** is downloading.`;
            statusMessage.className = 'status-message success';
            
        } catch (e) {
            console.error("FFmpeg Processing Error:", e);
            statusMessage.innerHTML = '❌ Processing failed. Check console for details.';
            statusMessage.className = 'status-message error';
        } finally {
            // Clean up the virtual file system
            try {
                ffmpeg.FS('unlink', inputFileName);
            } catch {}

            convertButton.disabled = false;
            // Restore status message unless an error occurred
            if (!statusMessage.className.includes('error')) {
                 statusMessage.innerHTML = '✅ FFmpeg ready. Select a file.';
                 statusMessage.className = 'status-message success';
            }
        }
    });
}
