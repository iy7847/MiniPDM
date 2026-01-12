
export const useFileHandler = (companyRootPath: string) => {

    const checkFileSystem = (): boolean => {
        // @ts-ignore
        if (!window.fileSystem || !companyRootPath) return false;
        return true;
    };

    const loadFileAsBase64 = async (relativePath: string): Promise<string | null> => {
        if (!checkFileSystem()) {
            console.warn('File system not initialized or root path missing');
            return null;
        }

        // Normalize inputs
        let fullPath = relativePath;
        if (!relativePath.includes(':\\') && !relativePath.startsWith(companyRootPath)) {
            const cleanPath = relativePath.replace(/^[/\\]/, '');
            fullPath = `${companyRootPath}\\${cleanPath}`;
        }

        try {
            // @ts-ignore
            const base64 = await window.fileSystem.readImage(fullPath);
            if (!base64) {
                console.error('Failed to read file:', fullPath);
                return null;
            }
            return base64;
        } catch (e) {
            console.error('File Read Error:', e);
            return null;
        }
    };

    const openFile = async (filePath: string) => {
        if (!checkFileSystem()) return { success: false, error: 'File system unavailable' };

        const isAbsolute = filePath.includes(':\\') || filePath.startsWith(companyRootPath);
        const root = isAbsolute ? '' : companyRootPath;

        try {
            // @ts-ignore
            return await window.fileSystem.openFile(root, filePath);
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const saveFile = async (sourcePathOrBuffer: string | Uint8Array, relativeFolder: string, fileName: string) => {
        if (!checkFileSystem()) return { success: false, error: 'File system unavailable' };

        try {
            if (typeof sourcePathOrBuffer === 'string') {
                // Save from Path
                // @ts-ignore
                return await window.fileSystem.saveFile(sourcePathOrBuffer, companyRootPath, relativeFolder);
            } else {
                // Save from Buffer
                // @ts-ignore
                return await window.fileSystem.writeFile(sourcePathOrBuffer, fileName, companyRootPath, relativeFolder);
            }
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const deleteFile = async (relativePath: string) => {
        if (!checkFileSystem()) return;
        try {
            // @ts-ignore
            await window.fileSystem.deleteFile(companyRootPath, relativePath);
        } catch (e) {
            console.warn('Delete file warning:', e);
        }
    }

    return {
        checkFileSystem,
        loadFileAsBase64,
        openFile,
        saveFile,
        deleteFile
    };
};
