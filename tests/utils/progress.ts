const progressEnabled = process.env.POWERSHELL_PROPERTY_PROGRESS === "1";

const defaultInterval = Number.parseInt(
    process.env.POWERSHELL_PROPERTY_PROGRESS_INTERVAL ?? "50",
    10
);

const interval =
    Number.isFinite(defaultInterval) && defaultInterval > 0
        ? defaultInterval
        : 50;

type ProgressTracker = {
    advance: () => number;
    complete: () => void;
};

export const createProgressTracker = (
    name: string,
    totalHint?: number
): ProgressTracker => {
    let count = 0;

    const emit = (message: string): void => {
        if (!progressEnabled) {
            return;
        }
        console.log(`[progress] ${name} ${message}`);
    };

    return {
        advance: () => {
            count += 1;
            if (!progressEnabled) {
                return count;
            }
            const shouldLog =
                count === 1 ||
                count % interval === 0 ||
                (typeof totalHint === "number" && count === totalHint);
            if (shouldLog) {
                if (typeof totalHint === "number") {
                    emit(`run ${count}/${totalHint}`);
                } else {
                    emit(`run ${count}`);
                }
            }
            return count;
        },
        complete: () => {
            emit(`completed after ${count} runs`);
        },
    };
};

export const withProgress = async <T>(
    name: string,
    totalHint: number | undefined,
    action: (tracker: ProgressTracker) => Promise<T> | T
): Promise<T> => {
    const tracker = createProgressTracker(name, totalHint);
    try {
        return await action(tracker);
    } finally {
        tracker.complete();
    }
};
