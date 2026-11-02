export function filenameOf(url) {
    const path = new URL(url, window.location.href).pathname;

    return decodeURIComponent(path.split('/').pop() || 'image');
}

export async function downloadFile(url, filename) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Download failed with status ${response.status}`);
        }

        const objectUrl = URL.createObjectURL(await response.blob());
        save(objectUrl, filename);
        // Revoking in the same task cancels the download in some browsers.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
        save(url, filename, '_blank');
    }
}

function save(href, filename, target = null) {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;

    if (target) {
        link.target = target;
        link.rel = 'noopener';
    }

    document.body.append(link);
    link.click();
    link.remove();
}
