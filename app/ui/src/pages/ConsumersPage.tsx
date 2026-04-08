import { useEffect, useState } from "react";
import type { LifecycleConfig } from "../../../src/tally/TallyLifecycle";

type ConsumerKey = keyof LifecycleConfig["consumers"];

type ConsumersMeta = {
    [K in ConsumerKey]: { displayName: string };
};

const CONSUMER_META: ConsumersMeta = {
    aedes: { displayName: "MQTT Broker" },
    gpio:  { displayName: "GPIO Hardware" },
};

export default function ConsumersPage() {
    const [consumers, setConsumers] = useState<LifecycleConfig["consumers"] | null>(null);

    const fetchConsumers = () =>
        fetch("/api/consumers")
            .then((r) => r.json())
            .then(setConsumers);

    useEffect(() => { fetchConsumers(); }, []);

    const toggle = (id: ConsumerKey, enabled: boolean) => {
        fetch(`/api/consumers/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled }),
        }).then(fetchConsumers);
    };

    if (!consumers) return <p>Loading...</p>;

    return (
        <div>
            <h1>Consumers</h1>
            {(Object.keys(CONSUMER_META) as ConsumerKey[]).map((id) => {
                const { displayName } = CONSUMER_META[id];
                const { enabled } = consumers[id];
                return (
                    <div key={id}>
                        <h2>{displayName}</h2>
                        <label>
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => toggle(id, e.target.checked)}
                            />
                            {enabled ? "Enabled" : "Disabled"}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}
