document.addEventListener('DOMContentLoaded', () => {
    // Get references to the key HTML elements
    const fileInput = document.getElementById('fileInput');
    const formatSelect = document.getElementById('formatSelect');
    const convertButton = document.getElementById('convertButton');
    const statusMessage = document.getElementById('statusMessage');

    // Add event listener to the Convert button
    convertButton.addEventListener('click', () => {
        // 1. Check if a file is selected
        if (fileInput.files.length === 0) {
            statusMessage.innerHTML = '⚠️ Please select a file first.';
            statusMessage.style.color = 'red';
            return; // Stop the function if no file is selected
        }

        const selectedFile = fileInput.files[0];
        const targetFormat = formatSelect.value;
        const originalFileName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
        
        // 2. Display 'Converting...' message and disable the button
        statusMessage.innerHTML = `⚙️ Converting **${selectedFile.name}** to **.${targetFormat}**...`;
        statusMessage.style.color = '#007bff';
        convertButton.disabled = true;

        // 3. SIMULATE the conversion process with a short delay (e.g., 2 seconds)
        setTimeout(() => {
            // Re-enable the button
            convertButton.disabled = false;

            // 4. Construct the simulated download link
            const simulatedDownloadLink = document.createElement('a');
            simulatedDownloadLink.href = 'javascript:void(0);'; // A dummy link
            simulatedDownloadLink.textContent = `Download ${originalFileName}.${targetFormat}`;
            simulatedDownloadLink.style.display = 'block';
            simulatedDownloadLink.style.marginTop = '15px';
            simulatedDownloadLink.style.color = '#28a745';
            simulatedDownloadLink.style.textDecoration = 'underline';
            
            // Clear status and append the download link
            statusMessage.innerHTML = '✅ Conversion Complete!';
            statusMessage.style.color = 'green';
            statusMessage.appendChild(simulatedDownloadLink);

        }, 2000); // 2000 milliseconds = 2 seconds
    });
});
