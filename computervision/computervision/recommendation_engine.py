def generate_recommendations(risk):
    recommendations = []

    if risk == "HIGH":
        recommendations.extend([
            "Open alternate gate",
            "Redirect attendees",
            "Notify event admin",
            "Deploy crowd management staff"
        ])

    elif risk == "MEDIUM":
        recommendations.extend([
            "Monitor zone closely",
            "Prepare alternate route"
        ])

    return recommendations