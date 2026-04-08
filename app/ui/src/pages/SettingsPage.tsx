import { useRef } from "react";

export default function SettingsPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        fetch("/api/config/export")
            .then((r) => r.json())
            .then((config) => {
                const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "beacon-config.json";
                a.click();
                URL.revokeObjectURL(url);
            });
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const config = JSON.parse(reader.result as string);
                fetch("/api/config/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(config),
                });
            } catch {
                alert("Invalid config file.");
            }
        };
        reader.readAsText(file);

        // Reset so the same file can be re-imported if needed
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div>
            <h1>Settings</h1>
            <section>
                <h2>Configuration</h2>
                <button onClick={handleExport}>Export config</button>
                <label>
                    Import config
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json"
                        onChange={handleImport}
                        style={{ marginLeft: 8 }}
                    />
                </label>
            </section>
        </div>
    );
}
