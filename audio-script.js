// Initialize FFmpeg instance globally
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

document.addEventListener('DOMContentLoaded', async () => {
    const fileInput = document.getElementById('fileInput');
    const formatSelect = document.getElementById('formatSelect');
    const bitrateInput = document.getElementById('bitrateInput');
    const trimStartInput = document.getElementById('trimStartInput');
    const trimEndInput = document.getElementById('trimEndInput');
    const convertButton = document.getElementById('convertButton');
    const statusMessage = document.getElementById('statusMessage');

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
        console.error(e);
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

            statusMessage.innerHTML = `✅ Processing Complete! **${outputFileName}** is downloading.`;
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
});
