def simulate_open_gate(predicted):
    reduced = int(predicted * 0.6)

    return {
        "currentPrediction": predicted,
        "afterOpeningGate": reduced
    }