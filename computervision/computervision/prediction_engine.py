def predict_congestion(
    current_occupancy,
    people_in,
    people_out
):
    net_flow = people_in - people_out

    predicted = current_occupancy + (net_flow * 10)

    if predicted > 200:
        risk = "HIGH"
    elif predicted > 100:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return {
        "predictedOccupancy": predicted,
        "riskLevel": risk
    }