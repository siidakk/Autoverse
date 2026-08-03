import pandas as pd

import numpy as np

from sklearn.preprocessing import LabelEncoder

from sklearn.ensemble import AdaBoostRegressor

from sklearn.tree import DecisionTreeRegressor

from sklearn.model_selection import train_test_split

from sklearn.metrics import (

    mean_absolute_error,
    mean_squared_error,
    r2_score

)

import joblib

# LOAD DATASET

df = pd.read_csv("cars.csv")

# IMPORTANT COLUMNS

columns = [

    "Make",
    "Model",
    "Engine HP",
    "city mpg",
    "highway MPG",
    "Transmission Type",
    "Driven_Wheels",
    "Vehicle Size",
    "Vehicle Style",
    "MSRP"

]

print(df["Vehicle Style"].unique())
print(df["Vehicle Size"].unique())
print(df["Driven_Wheels"].unique())
print(df["Transmission Type"].unique())

df = df[columns]

# REMOVE NULL VALUES

df.dropna(inplace=True)

# ENCODERS

encoders = {}

categorical_columns = [

    "Transmission Type",
    "Driven_Wheels",
    "Vehicle Size",
    "Vehicle Style"

]

# ENCODE CATEGORICAL VALUES

for column in categorical_columns:

    le = LabelEncoder()

    df[column] = le.fit_transform(
        df[column]
    )

    encoders[column] = le

# CREATE RECOMMENDATION SCORE

df["score"] = (

    (df["Engine HP"] * 0.4)

    +

    (df["highway MPG"] * 0.2)

    +

    (df["city mpg"] * 0.2)

    +

    ((200000 - df["MSRP"]) / 1000 * 0.2)

)

# FEATURES

X = df[[

    "Engine HP",
    "city mpg",
    "highway MPG",
    "Transmission Type",
    "Driven_Wheels",
    "Vehicle Size",
    "Vehicle Style"

]]

# TARGET

y = df["score"]

# TRAIN TEST SPLIT

X_train, X_test, y_train, y_test = train_test_split(

    X,
    y,
    test_size=0.2,
    random_state=42

)

# BASE MODEL

base_model = DecisionTreeRegressor(
    max_depth=4
)

# ADABOOST MODEL

model = AdaBoostRegressor(

    estimator=base_model,

    n_estimators=100,

    learning_rate=0.5,

    random_state=42

)

# TRAIN MODEL

model.fit(X_train, y_train)

# PREDICTIONS

predictions = model.predict(X_test)

# EVALUATION

mae = mean_absolute_error(
    y_test,
    predictions
)

mse = mean_squared_error(
    y_test,
    predictions
)

rmse = np.sqrt(mse)

r2 = r2_score(
    y_test,
    predictions
)


# PRINT METRICS

print("\nMODEL EVALUATION\n")

print(f"MAE  : {mae:.2f}")

print(f"MSE  : {mse:.2f}")

print(f"RMSE : {rmse:.2f}")

print(f"R2   : {r2:.2f}")

print(
    f"Approx Accuracy : {r2 * 100:.2f}%"
)

# SAVE MODEL

joblib.dump(

    model,
    "car_recommendation_model.pkl"

)

# SAVE ENCODERS

joblib.dump(

    encoders,
    "encoders.pkl"

)

# SAVE DATASET

joblib.dump(

    df,
    "processed_cars.pkl"

)

print("\nModel Trained Successfully")