import { useEffect, useState } from "react";
import type { AdminState } from "../../../src/admin/AdminServer";

type Producer = AdminState["producers"][number];

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
                    <li key={p.config.id}>{p.config.name ?? p.config.id} ({p.type})</li>
                ))}
            </ul>
        </div>
    );
}
