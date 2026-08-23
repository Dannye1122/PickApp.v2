export const triggerWebCamera = () => {
    return new Promise<string>((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (event: any) => {
            const file = event.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = (err) => {
                    reject(err);
                };
                reader.readAsDataURL(file);
            } else {
                reject(new Error("No file selected"));
            }
        };
        input.onerror = (err) => {
            reject(err);
        };
        input.click();
    });
};
