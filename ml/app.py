from flask import Flask, request, jsonify

from flask_cors import CORS

import pandas as pd

import joblib

# LOAD MODEL

model = joblib.load(
    "car_recommendation_model.pkl"
)

encoders = joblib.load(
    "encoders.pkl"
)

df = joblib.load(
    "processed_cars.pkl"
)

app = Flask(__name__)

CORS(app)

@app.route("/recommend", methods=["POST"])

def recommend():

    data = request.json

    horsepower = data["horsepower"]

    city_mpg = data["city_mpg"]

    highway_mpg = data["highway_mpg"]

    transmission = data["transmission"]

    wheels = data["driven_wheels"]

    vehicle_size = data["vehicle_size"]

    vehicle_style = data["vehicle_style"]

    # ENCODE INPUTS

    transmission_encoded = encoders[
        "Transmission Type"
    ].transform([transmission])[0]

    wheels_encoded = encoders[
        "Driven_Wheels"
    ].transform([wheels])[0]

    size_encoded = encoders[
        "Vehicle Size"
    ].transform([vehicle_size])[0]

    style_encoded = encoders[
        "Vehicle Style"
    ].transform([vehicle_style])[0]

    # CREATE INPUT

    input_data = [[

        horsepower,
        city_mpg,
        highway_mpg,
        transmission_encoded,
        wheels_encoded,
        size_encoded,
        style_encoded

    ]]

    # GET USER SCORE

    predicted_score = model.predict(
        input_data
    )[0]

    # CALCULATE DIFFERENCE

    df["difference"] = abs(
        df["score"] - predicted_score
    )

    # SORT BEST MATCHES

    recommendations = df.sort_values(
        by="difference"
    ).head(5)

    # FORMAT OUTPUT

    result = []

    for _, row in recommendations.iterrows():

        result.append({

            "make": row["Make"],

            "model": row["Model"],

            "horsepower": row["Engine HP"],

            "city_mpg": row["city mpg"],

            "highway_mpg": row["highway MPG"],

            "price": row["MSRP"]

        })
        

    return jsonify(result)

if __name__ == "__main__":

    app.run(
        port=8000,
        debug=True
    )

    