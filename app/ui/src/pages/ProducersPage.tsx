import { useEffect, useState } from "react";

interface Producer {
    id: string;
    type: string;
    config: Record<string, unknown>;
}

export default function ProducersPage() {
    const [producers, setProducers] = useState<Producer[]>([]);

    useEffect(() => {
        fetch("/api/producers")
            .then((r) => r.json())
            .then(setProducers);
    }, []);

    return (
        <div>
            <h1>Producers</h1>
            <ul>
                {producers.map((p) => (
                    <li key={p.id}>{p.name ?? p.id} ({p.type})</li>
                ))}
            </ul>
        </div>
    );
}
