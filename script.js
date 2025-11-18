document.addEventListener('DOMContentLoaded', () => {
    // Get references to the key HTML elements
    const fileInput = document.getElementById('fileInput');
    const convertButton = document.getElementById('convertButton');
    const statusMessage = document.getElementById('statusMessage');

    // Asynchronous function to handle the conversion process
    convertButton.addEventListener('click', async () => {
        // 1. Validation
        if (fileInput.files.length === 0) {
            statusMessage.innerHTML = '⚠️ Please select a file first.';
            statusMessage.style.color = 'red';
            return;
        }

        const selectedFile = fileInput.files[0];
        
        // 2. Set Status and Disable Button
        statusMessage.innerHTML = `⚙️ Processing **${selectedFile.name}**...`;
        statusMessage.style.color = '#007bff';
        convertButton.disabled = true;

        try {
            // 3. Read the file content
            const fileData = await readFileAsync(selectedFile);

            // 4. Create a new JSZip instance
            const zip = new JSZip();
            
            // 5. Add the file to the ZIP archive
            // zip.file(filename, content, options)
            zip.file(selectedFile.name, fileData);
            
            // 6. Generate the ZIP file content (the client-side conversion!)
            const content = await zip.generateAsync({ type: "blob" });

            // 7. Trigger the Download
            const originalFileName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
            const newFileName = `${originalFileName}.zip`;
            
            // Create a temporary link element
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(content); // Create a URL for the Blob data
            downloadLink.download = newFileName; // Set the download filename
            
            // Click the link to trigger the download
            downloadLink.click();
            
            // Cleanup the temporary URL
            URL.revokeObjectURL(downloadLink.href);

            // 8. Display Success Message
            statusMessage.innerHTML = `✅ Conversion Complete! **${newFileName}** is downloading.`;
            statusMessage.style.color = 'green';
            
        } catch (error) {
            // 9. Handle Errors
            console.error("Conversion failed:", error);
            statusMessage.innerHTML = '❌ Conversion Error. Check console for details.';
            statusMessage.style.color = 'darkred';
        } finally {
            // Re-enable the button regardless of success or failure
            convertButton.disabled = false;
        }
    });
});

/**
 * Helper function to read the selected File object as an ArrayBuffer.
 * This is necessary for JSZip to handle the file data correctly.
 * @param {File} file - The file selected by the user.
 * @returns {Promise<ArrayBuffer>} The file data as an ArrayBuffer.
 */
function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            // The result is the ArrayBuffer
            resolve(reader.result);
        };

        reader.onerror = (error) => {
            reject(error);
        };
        
        // Read the file as an ArrayBuffer
        reader.readAsArrayBuffer(file);
    });
}
