import { useEffect, useState } from "react";

interface Consumer {
    id: string;
    type: string;
    config: Record<string, unknown>;
}

export default function ConsumersPage() {
    const [consumers, setConsumers] = useState<Consumer[]>([]);

    useEffect(() => {
        fetch("/api/consumers")
            .then((r) => r.json())
            .then(setConsumers);
    }, []);

    return (
        <div>
            <h1>Consumers</h1>
            <ul>
                {consumers.map((c) => (
                    <li key={c.id}>{c.name ?? c.id} ({c.type})</li>
                ))}
            </ul>
        </div>
    );
}
