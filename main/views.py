from django.shortcuts import render
from django.views.generic import TemplateView
import pandas as pd
import numpy as np
import geopandas as gpd
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.clickjacking import xframe_options_exempt
from django.conf import settings

datelist = settings.DATELIST_PATH
mrcffgs = settings.MRCFFGS_PATH
mekongxray = settings.MEKONGXRAY_PATH
events_country = settings.EVENTS_COUNTRYWISE_PATH
storms = settings.STORMS_DATA_PATH

class HomePage(TemplateView):
    template_name = 'index.html'

class BulletinPage(TemplateView):
    template_name = 'bulletin.html'

@csrf_exempt
@xframe_options_exempt
def get_mrcffg_value(request):
    param = request.GET.get('param')
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    data = mrcffgs+"_"+formatted_date+"06.csv"
    df = pd.read_csv(data)
    selected_col = df[["BASIN", param]]
    data = selected_col.to_json(orient='records')
    return JsonResponse(data, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_mrcffg_bulletin_data(request):
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    data = mrcffgs+"_"+formatted_date+"06.csv"
    df = pd.read_csv(data)
    selected_col = df[["BASIN", "ASMT", "MAP24", "FMAP06", "FFG06", "FFFT06", "FFR12", "FFR24"]]
    data = selected_col.to_json(orient='records')
    return JsonResponse(data, safe=False)

# Function to assign alert
def assign_alert(row):
    if (60 < row['FFG06'] <= 100) or (0.01 < row['FFFT06'] < 10):
        return 'Low'
    elif (30 < row['FFG06'] <= 60) or (10 < row['FFFT06'] < 40):
        return 'Moderate'
    elif (0.01 < row['FFG06'] <= 30) or (40 < row['FFFT06'] < 100):
        return 'High'
    else:
        return np.nan

int_columns = ['ID_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'Hospital']
float_columns = ['RTP1', 'RTP2', 'RTP3', 'RTP4', 'GDP', 'crop_sqm']
float_round_0_cols = ['GDP', 'crop_sqm']
float_round_2_cols = ['RTP1', 'RTP2', 'RTP3', 'RTP4']

@csrf_exempt
@xframe_options_exempt
def get_alert_stat_6hrs(request):
    """
        Receives an HTTP request, reads basin and parameter data from two csv files, categorizes the parameter data into 
        'High Risk', 'Moderate Risk', and 'Low Risk' based on predefined bins, merges the two dataframes on 'BASIN' column 
        keeping only the matching records, and returns the merged dataframe in JSON format.

        The `assign_alert` function is used to categorize the parameter data into 'Low', 'Moderate', and 'High' risk categories.
        The dataframe is then modified to replace 'Invalid' values with NaN and drop rows where all risk categories are NaN.
        Finally, the two dataframes are merged on the 'BASIN' column and returned as a JsonResponse.

        :param request: HTTP request
        :return: JsonResponse containing merged dataframe in JSON format

        :rtype: JsonResponse
    """
    static_data_path = mekongxray
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    mrcffgs_data_path = mrcffgs+"_"+formatted_date+"06.csv"
    df1 = pd.read_csv(static_data_path)
    df1[int_columns] = df1[int_columns].astype(int)
    df1[float_columns] = df1[float_columns].astype(float)
    df1[float_round_0_cols] = df1[float_round_0_cols].round(0)
    df1[float_round_2_cols] = df1[float_round_2_cols].round(2)
    df1.rename(columns={'value': 'BASIN'}, inplace=True)
    df2 = pd.read_csv(mrcffgs_data_path)
    df2 = df2[["BASIN", "FFG06", "FFFT06"]]
    join_df = df1.merge(df2, on='BASIN', how='inner')
    scols_ffg = join_df[['ID_2', 'ISO', 'NAME_1', 'NAME_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'RTP1', 'RTP2', 'RTP3', 'RTP4', 'Hospital', 'GDP', 'crop_sqm', 'FFG06']]
    scols_ffft = join_df[['NAME_2', 'FFFT06']]
    grouped_max_FFG = scols_ffg.groupby(['NAME_2']).agg({
        'ID_2': 'first',
        'ISO': 'first',
        'NAME_1': 'first',
        'M1': 'sum',
        'M2': 'sum',
        'M3': 'sum',
        'F1': 'sum',
        'F2': 'sum',
        'F3': 'sum',
        'RTP1': 'sum',
        'RTP2': 'sum',
        'RTP3': 'sum',
        'RTP4': 'sum',
        'Hospital': 'sum',
        'GDP': 'sum',
        'crop_sqm': 'sum',
        'FFG06': 'min',
    }).reset_index()
    grouped_max_FFFT = scols_ffft.groupby(['NAME_2']).agg({'FFFT06': 'max'})
    join_max = grouped_max_FFG.merge(grouped_max_FFFT, on="NAME_2")
    join_max['Alert_6Hrs'] = join_max.apply(lambda row: assign_alert(row), axis=1)
    final_df = join_max.dropna(subset=['Alert_6Hrs'], how='all')
    json = final_df.to_json(orient='records')
    return JsonResponse(json, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_risk_stat_12hrs(request):
    """
        Receives an HTTP request, reads basin and parameter data from two csv files, categorizes the parameter data into 
        'High Risk', 'Moderate Risk', and 'Low Risk' based on predefined bins, merges the two dataframes on 'BASIN' column 
        keeping only the matching records, and returns the merged dataframe in JSON format.

        The `assign_alert` function is used to categorize the parameter data into 'Low', 'Moderate', and 'High' risk categories.
        The dataframe is then modified to replace 'Invalid' values with NaN and drop rows where all risk categories are NaN.
        Finally, the two dataframes are merged on the 'BASIN' column and returned as a JsonResponse.

        :param request: HTTP request
        :return: JsonResponse containing merged dataframe in JSON format

        :rtype: JsonResponse
    """
    static_data_path = mekongxray
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    mrcffgs_data_path = mrcffgs+"_"+formatted_date+"06.csv"
    df1 = pd.read_csv(static_data_path)
    df1[int_columns] = df1[int_columns].astype(int)
    df1[float_columns] = df1[float_columns].astype(float)
    df1[float_round_0_cols] = df1[float_round_0_cols].round(0)
    df1[float_round_2_cols] = df1[float_round_2_cols].round(2)
    df1.rename(columns={'value': 'BASIN'}, inplace=True)
    df2 = pd.read_csv(mrcffgs_data_path)
    df2 = df2[["BASIN", "FFR12"]]
    join_df = df1.merge(df2, on='BASIN', how='inner')
    scols = join_df[['ISO', 'NAME_1', 'NAME_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'RTP1', 'RTP2', 'RTP3', 'RTP4', 'Hospital', 'GDP', 'crop_sqm', 'FFR12']]
    grouped_max = scols.groupby(['NAME_2']).agg({
        'ISO': 'first',
        'NAME_1': 'first',
        'M1': 'sum',
        'M2': 'sum',
        'M3': 'sum',
        'F1': 'sum',
        'F2': 'sum',
        'F3': 'sum',
        'RTP1': 'sum',
        'RTP2': 'sum',
        'RTP3': 'sum',
        'RTP4': 'sum',
        'Hospital': 'sum',
        'GDP': 'sum',
        'crop_sqm': 'sum',
        'FFR12': 'min',
    }).reset_index()
    bins = [-np.inf, 0.01, 0.2, 0.4, 1, np.inf]
    labels = ['Invalid', 'High', 'Moderate', 'Low', 'Invalid']
    grouped_max['Risk_12Hrs'] = pd.cut(grouped_max["FFR12"], bins=bins, labels=labels, right=True, ordered=False)
    grouped_max = grouped_max.replace('Invalid', np.nan)
    final_df = grouped_max.dropna(subset=['Risk_12Hrs'], how='all')
    json = final_df.to_json(orient='records')
    return JsonResponse(json, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_risk_stat_24hrs(request):
    """
        Receives an HTTP request, reads basin and parameter data from two csv files, categorizes the parameter data into 
        'High Risk', 'Moderate Risk', and 'Low Risk' based on predefined bins, merges the two dataframes on 'BASIN' column 
        keeping only the matching records, and returns the merged dataframe in JSON format.

        The `assign_alert` function is used to categorize the parameter data into 'Low', 'Moderate', and 'High' risk categories.
        The dataframe is then modified to replace 'Invalid' values with NaN and drop rows where all risk categories are NaN.
        Finally, the two dataframes are merged on the 'BASIN' column and returned as a JsonResponse.

        :param request: HTTP request
        :return: JsonResponse containing merged dataframe in JSON format

        :rtype: JsonResponse
    """
    static_data_path = mekongxray
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    mrcffgs_data_path = mrcffgs+"_"+formatted_date+"06.csv"
    df1 = pd.read_csv(static_data_path)
    df1[int_columns] = df1[int_columns].astype(int)
    df1[float_columns] = df1[float_columns].astype(float)
    df1[float_round_0_cols] = df1[float_round_0_cols].round(0)
    df1[float_round_2_cols] = df1[float_round_2_cols].round(2)
    df1.rename(columns={'value': 'BASIN'}, inplace=True)
    df2 = pd.read_csv(mrcffgs_data_path)
    df2 = df2[["BASIN", "FFR24"]]
    join_df = df1.merge(df2, on='BASIN', how='inner')
    scols = join_df[['ISO', 'NAME_1', 'NAME_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'RTP1', 'RTP2', 'RTP3', 'RTP4', 'Hospital', 'GDP', 'crop_sqm', 'FFR24']]
    grouped_max = scols.groupby(['NAME_2']).agg({
        'ISO': 'first',
        'NAME_1': 'first',
        'M1': 'sum',
        'M2': 'sum',
        'M3': 'sum',
        'F1': 'sum',
        'F2': 'sum',
        'F3': 'sum',
        'RTP1': 'sum',
        'RTP2': 'sum',
        'RTP3': 'sum',
        'RTP4': 'sum',
        'Hospital': 'sum',
        'GDP': 'sum',
        'crop_sqm': 'sum',
        'FFR24': 'min',
    }).reset_index()
    bins = [-np.inf, 0.01, 0.2, 0.4, 1, np.inf]
    labels = ['Invalid', 'High', 'Moderate', 'Low', 'Invalid']
    grouped_max['Risk_24Hrs'] = pd.cut(grouped_max["FFR24"], bins=bins, labels=labels, right=True, ordered=False)
    grouped_max = grouped_max.replace('Invalid', np.nan)
    final_df = grouped_max.dropna(subset=['Risk_24Hrs'], how='all')
    json = final_df.to_json(orient='records')
    return JsonResponse(json, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_storms(request):
    data = storms
    df = pd.read_csv(data)
    scols = df[["Date", "Return_Period"]].copy()
    bins = [0, 10, 50, 500, 1000]
    labels = ['Low', 'Moderate', 'Sever', 'Extreme']
    scols['Category'] = pd.cut(scols["Return_Period"], bins=bins, labels=labels, right=True, ordered=False)
    json = scols.to_json(orient='records')
    return JsonResponse(json, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_storms_number_by_country(request):
    data = events_country
    df = pd.read_csv(data)
    json = df.to_json(orient='records')
    # print(json)
    return JsonResponse(json, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_datelist(request):
    data = datelist
    df = pd.read_csv(data)
    json = df.to_json(orient='values')
    print(json)
    return JsonResponse(json, safe=False)
