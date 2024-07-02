from django.shortcuts import render
from django.views.generic import TemplateView
from shapely.geometry import Polygon, MultiPolygon
import pandas as pd
import numpy as np
import geopandas as gpd
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.clickjacking import xframe_options_exempt
from django.conf import settings
from .models import Bulletin
from datetime import datetime
import os, json
import subprocess
from django.http import FileResponse, HttpResponse
from django.http import HttpResponse

datelist = settings.DATELIST_PATH
seaffgs = settings.SEAFFGS_DATA_PATH
mekongxray = settings.MEKONGXRAY_PATH
events_country = settings.EVENTS_COUNTRYWISE_PATH
storms = settings.STORMS_DATA_PATH
basin_attr = settings.BASIN_ATTR_PATH

class HomePage(TemplateView):
    template_name = 'index.html'

class MapPage(TemplateView):
    template_name = 'map.html'

class BulletinPage(TemplateView):
    template_name = 'bulletin.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        try:
            context['bulletin_summary'] = Bulletin.objects.order_by('-created_at')[0]
        except IndexError:
            context['bulletin_summary'] = None
        return context

def get_seaffgs_data_path(date_string):
    base_path = seaffgs
    date_object = datetime.strptime(date_string, '%Y-%m-%d')
    year = date_object.year
    month = date_object.strftime('%m')  # Format month with leading zero
    day = date_object.strftime('%d')    # Format day with leading zero
    data_path = f"{base_path}/{year}/{month}/{day}"
    return data_path

selected_columns = ["BASIN","MAP06","MAP24", "ASMU01", "FFG01","FFG03","FFG06", "F2MAP01","F2MAP03","F2MAP06","F2MAP24", "F2FFT01","F2FFT03","F2FFT06", "F2FFR12","F2FFR24"]

rename_mapping = {
    "ASMU01": "ASMT",
    "F2MAP01": "FMAP01",
    "F2MAP03": "FMAP03",
    "F2MAP06": "FMAP06",
    "F2MAP24": "FMAP24",
    "F2FFT01": "FFFT01",
    "F2FFT03": "FFFT03",
    "F2FFT06": "FFFT06",
    "F2FFR12": "FFR12",
    "F2FFR24": "FFR24"
}

def extract_hours_from_files(folder_path):
    # Set to store unique hours
    hours_set = set()

    # Iterate over files in the folder
    for file_name in os.listdir(folder_path):
        # Check if the path is a file (not directory) and ends with .csv.gz
        if file_name.endswith('.csv.gz') and os.path.isfile(os.path.join(folder_path, file_name)):
            # Extract hour from the filename
            hour = file_name.split('.')[0][-2:]
            hours_set.add(hour.zfill(2))  # Add leading zeros to the hour

    return sorted(list(hours_set))  # Return sorted list of unique hours


@csrf_exempt
@xframe_options_exempt
def get_datelist(request):
    data = datelist
    df = pd.read_csv(data, header=None, encoding='utf-8-sig')
    # Sort the DataFrame by the date column in descending order
    df = df.sort_values(by=0, ascending=False)
    json = df.to_json(orient='values')
    return JsonResponse(json, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_hours(request):
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    data_path = get_seaffgs_data_path(date_str)
    hours = extract_hours_from_files(data_path)
    return JsonResponse(hours, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_seaffgs_value(request):
    param = request.GET.get('param')
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    hrs = request.GET.get("hrs")
    get_data_path = get_seaffgs_data_path(date_str)
    data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
    df = pd.read_csv(data_path)
    filtered_df = df[selected_columns] 
    renamed_cols = filtered_df.rename(columns=rename_mapping)
    selected_col = renamed_cols[["BASIN", param]]
    data = selected_col.to_json(orient='records')
    return JsonResponse(data, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_seaffgs_bulletin_data(request):
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    hrs = request.GET.get("hrs")
    get_data_path = get_seaffgs_data_path(date_str)
    data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
    df = pd.read_csv(data_path)
    filtered_df = df[selected_columns] 
    renamed_cols = filtered_df.rename(columns=rename_mapping)
    selected_col = renamed_cols[["BASIN", "ASMT", "MAP24", "FMAP06", "FFG06", "FFFT06", "FFR12", "FFR24"]]
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

def assign_alert_1hrs(row):
    if (40 < row['FFG01'] <= 60):
        return 'Low'
    elif (25 < row['FFG01'] <= 40):
        return 'Moderate'
    elif (0.01 < row['FFG01'] <= 25):
        return 'High'
    else:
        return np.nan

def assign_alert_3hrs(row):
    if (40 < row['FFG03'] <= 70):
        return 'Low'
    elif (25 < row['FFG03'] <= 40):
        return 'Moderate'
    elif (0.01 < row['FFG03'] <= 25):
        return 'High'
    else:
        return np.nan

@csrf_exempt
@xframe_options_exempt
def get_alert_stat_1hrs(request):
    try:
        static_data_path = basin_attr
        date_str = request.GET.get("date")
        formatted_date = date_str.replace("-", "")
        hrs = request.GET.get("hrs")
        get_data_path = get_seaffgs_data_path(date_str)
        seaffgs_data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
        df1 = pd.read_csv(static_data_path)
        df1.rename(columns={'bid': 'BASIN', 'iso': 'ISO', 'province': 'NAME_1', 'district': 'NAME_2'}, inplace=True)
        df2 = pd.read_csv(seaffgs_data_path)
        filtered_df2 = df2[selected_columns] 
        renamed_cols2 = filtered_df2.rename(columns=rename_mapping)
        s_df2 = renamed_cols2[["BASIN", "FFG01"]]
        join_df = df1.merge(s_df2, on='BASIN', how='inner')
        scols_ffg = join_df[['ISO', 'NAME_1', 'NAME_2', 'FFG01']]
        grouped_max_FFG = scols_ffg.groupby(['NAME_2']).agg({
            'ISO': 'first',
            'NAME_1': 'first',
            'FFG01': 'median',
        }).reset_index()
        grouped_max_FFG['Alert_1Hrs'] = grouped_max_FFG.apply(lambda row: assign_alert_1hrs(row), axis=1)
        final_df = grouped_max_FFG.dropna(subset=['Alert_1Hrs'], how='all')
        final_df = final_df.rename(columns={'Alert_1Hrs': 'Level'})
        json = final_df.to_json(orient='records')
        return JsonResponse(json, safe=False)
    except FileNotFoundError:
        # Return a JSON response indicating that data was not found.
        return JsonResponse({"error": "Data not found"}, status=404)

@csrf_exempt
@xframe_options_exempt
def get_alert_stat_3hrs(request):
    try:
        static_data_path = basin_attr
        date_str = request.GET.get("date")
        formatted_date = date_str.replace("-", "")
        hrs = request.GET.get("hrs")
        get_data_path = get_seaffgs_data_path(date_str)
        seaffgs_data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
        df1 = pd.read_csv(static_data_path)
        df1.rename(columns={'bid': 'BASIN', 'iso': 'ISO', 'province': 'NAME_1', 'district': 'NAME_2'}, inplace=True)
        df2 = pd.read_csv(seaffgs_data_path)
        filtered_df2 = df2[selected_columns] 
        renamed_cols2 = filtered_df2.rename(columns=rename_mapping)
        s_df2 = renamed_cols2[["BASIN", "FFG03"]]
        join_df = df1.merge(s_df2, on='BASIN', how='inner')
        scols_ffg = join_df[['ISO', 'NAME_1', 'NAME_2', 'FFG03']]
        grouped_max_FFG = scols_ffg.groupby(['NAME_2']).agg({
            'ISO': 'first',
            'NAME_1': 'first',
            'FFG03': 'max',
        }).reset_index()
        grouped_max_FFG['Alert_3Hrs'] = grouped_max_FFG.apply(lambda row: assign_alert_3hrs(row), axis=1)
        final_df = grouped_max_FFG.dropna(subset=['Alert_3Hrs'], how='all')
        final_df = final_df.rename(columns={'Alert_3Hrs': 'Level'})
        json = final_df.to_json(orient='records')
        return JsonResponse(json, safe=False)
    except FileNotFoundError:
        # Return a JSON response indicating that data was not found.
        return JsonResponse({"error": "Data not found"}, status=404)

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
    try:
        static_data_path = basin_attr
        date_str = request.GET.get("date")
        formatted_date = date_str.replace("-", "")
        hrs = request.GET.get("hrs")
        get_data_path = get_seaffgs_data_path(date_str)
        seaffgs_data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
        df1 = pd.read_csv(static_data_path)
        df1.rename(columns={'bid': 'BASIN', 'iso': 'ISO', 'province': 'NAME_1', 'district': 'NAME_2'}, inplace=True)
        df2 = pd.read_csv(seaffgs_data_path)
        filtered_df2 = df2[selected_columns] 
        renamed_cols2 = filtered_df2.rename(columns=rename_mapping)
        s_df2 = renamed_cols2[["BASIN", "FFG06", "FFFT06"]]
        join_df = df1.merge(s_df2, on='BASIN', how='inner')
        scols_ffg = join_df[['ISO', 'NAME_1', 'NAME_2', 'FFG06']]
        scols_ffft = join_df[['NAME_2', 'FFFT06']]
        grouped_max_FFG = scols_ffg.groupby(['NAME_2']).agg({
            'ISO': 'first',
            'NAME_1': 'first',
            'FFG06': 'max',
        }).reset_index()
        grouped_max_FFFT = scols_ffft.groupby(['NAME_2']).agg({'FFFT06': 'max'})
        join_max = grouped_max_FFG.merge(grouped_max_FFFT, on="NAME_2")
        join_max['Alert_6Hrs'] = join_max.apply(lambda row: assign_alert(row), axis=1)
        final_df = join_max.dropna(subset=['Alert_6Hrs'], how='all')
        final_df = final_df.rename(columns={'Alert_6Hrs': 'Level'})
        json = final_df.to_json(orient='records')
        return JsonResponse(json, safe=False)
    except FileNotFoundError:
        # Return a JSON response indicating that data was not found.
        return JsonResponse({"error": "Data not found"}, status=404)

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
    static_data_path = basin_attr
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    hrs = request.GET.get("hrs")
    get_data_path = get_seaffgs_data_path(date_str)
    seaffgs_data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
    df1 = pd.read_csv(static_data_path)
    df1.rename(columns={'bid': 'BASIN', 'iso': 'ISO', 'province': 'NAME_1', 'district': 'NAME_2'}, inplace=True)
    df2 = pd.read_csv(seaffgs_data_path)
    filtered_df2 = df2[selected_columns] 
    renamed_cols2 = filtered_df2.rename(columns=rename_mapping)
    s_df2 = renamed_cols2[["BASIN", "FFR12"]]
    join_df = df1.merge(s_df2, on='BASIN', how='inner')
    scols = join_df[['ISO', 'NAME_1', 'NAME_2', 'FFR12']]
    grouped_max = scols.groupby(['NAME_2']).agg({
        'ISO': 'first',
        'NAME_1': 'first',
        'FFR12': 'max',
    }).reset_index()
    
    bins = [-np.inf, 0.01, 0.3, 0.6, 1, np.inf]
    labels = ['Invalid', 'Low', 'Moderate', 'High', 'Invalid']
    grouped_max['Risk_12Hrs'] = pd.cut(grouped_max["FFR12"], bins=bins, labels=labels, right=True, ordered=False)
    grouped_max = grouped_max.replace('Invalid', np.nan)
    final_df = grouped_max.dropna(subset=['Risk_12Hrs'], how='all')
    final_df = final_df.rename(columns={'Risk_12Hrs': 'Level'})
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
    static_data_path = basin_attr
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    hrs = request.GET.get("hrs")
    get_data_path = get_seaffgs_data_path(date_str)
    seaffgs_data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
    df1 = pd.read_csv(static_data_path)
    df1.rename(columns={'bid': 'BASIN', 'iso': 'ISO', 'province': 'NAME_1', 'district': 'NAME_2'}, inplace=True)
    df2 = pd.read_csv(seaffgs_data_path)
    filtered_df2 = df2[selected_columns] 
    renamed_cols2 = filtered_df2.rename(columns=rename_mapping)
    s_df2 = renamed_cols2[["BASIN", "FFR24"]]
    join_df = df1.merge(s_df2, on='BASIN', how='inner')
    scols = join_df[['ISO', 'NAME_1', 'NAME_2', 'FFR24']]
    grouped_max = scols.groupby(['NAME_2']).agg({
        'ISO': 'first',
        'NAME_1': 'first',
        'FFR24': 'max',
    }).reset_index()
    
    bins = [-np.inf, 0.01, 0.3, 0.6, 1, np.inf]
    labels = ['Invalid', 'Low', 'Moderate', 'High', 'Invalid']
    grouped_max['Risk_24Hrs'] = pd.cut(grouped_max["FFR24"], bins=bins, labels=labels, right=True, ordered=False)
    
    grouped_max = grouped_max.replace('Invalid', np.nan)
    
    final_df = grouped_max.dropna(subset=['Risk_24Hrs'], how='all')
    
    final_df = final_df.rename(columns={'Risk_24Hrs': 'Level'})
    jsonData = final_df.to_json(orient='records')
    return JsonResponse(jsonData, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_storms(request):
    data = storms
    df = pd.read_csv(data)
    scols = df[["Date", "Return_Period", "countries"]].copy()
    bins = [0, 10, 50, 500, 1000]
    labels = ['Low', 'Moderate', 'Severe', 'Extreme']
    scols['Category'] = pd.cut(scols["Return_Period"], bins=bins, labels=labels, right=True, ordered=False)
    json = scols.to_json(orient='records')
    return JsonResponse(json, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_storms_number_by_country(request):
    data = events_country
    df = pd.read_csv(data)
    df.fillna(0, inplace=True)
    json = df.to_json(orient='records')
    return JsonResponse(json, safe=False)

@csrf_exempt
@xframe_options_exempt
def get_basin_chart(request):
    basin_id = request.GET.get("basin_id")
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    hrs = request.GET.get("hrs")
    get_data_path = get_seaffgs_data_path(date_str)
    seaffgs_data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
    df = pd.read_csv(seaffgs_data_path)
    df = df[["BASIN", "FFG01", "FFG03", "FFG06"]]
    selected_basin = df[df['BASIN'] == int(basin_id)]
    json = selected_basin.to_json(orient='records')
    return JsonResponse(json, safe=False)

def pdf_template_view(request):
    # Create an instance of the BulletinPage view to access the get_context_data method
    bulletin_page = BulletinPage()

    # Call get_context_data to get the 'bulletin_summary' value
    bulletin_summary = bulletin_page.get_context_data().get('bulletin_summary')

    context = {
        'selectedDate': request.GET.get('selectedDate'),
        'selectedHr': request.GET.get('selectedHr'),
        'selectedCountry': request.GET.get('selectedCountry'),
        'bulletin_summary': bulletin_summary
    }
    return render(request, "pdf_template.html", context)

def get_risk_map(request):
    static_data_path = 'static/data/basins_with_attr.gpkg'
    param = request.GET.get("param")
    date_str = request.GET.get("date")
    formatted_date = date_str.replace("-", "")
    hr = request.GET.get("hr")
    get_data_path = get_seaffgs_data_path(date_str)
    seaffgs_data_path = f'{get_data_path}/{formatted_date}{hr}.csv.gz'

    # Read the static GeoJSON data
    df1 = gpd.read_file(static_data_path)
    # df1['geometry'] = df1['geometry'].apply(ensure_right_hand_rule)
    # df1 = df1[['bid', 'ISO_2', 'Province', 'District', 'Country', 'geometry']]
    # df1.rename(columns={'bid': 'BASIN', 'ISO_2': 'iso', 'Province': 'province', 'District': 'district', 'Country': 'country'}, inplace=True)
    # df1.to_file('basins_with_attr.gpkg', driver='GPKG')
    
    df2 = pd.read_csv(seaffgs_data_path)
    filtered_df2 = df2[selected_columns] 
    renamed_cols2 = filtered_df2.rename(columns=rename_mapping)
    if param == "FFG06":
        s_df2 = renamed_cols2[["BASIN", "FFG06", "FFFT06"]]
        join_df = df1.merge(s_df2, on='BASIN', how='inner')
        join_df['level'] = join_df.apply(lambda row: assign_alert(row), axis=1)
    else:
        s_df2 = renamed_cols2[["BASIN", param]]
        join_df = df1.merge(s_df2, on='BASIN', how='inner')
        bins = [-np.inf, 0.01, 0.3, 0.6, 1, np.inf]
        labels = ['Invalid', 'Low', 'Moderate', 'High', 'Invalid']
        join_df['level'] = pd.cut(join_df[param], bins=bins, labels=labels, right=True, ordered=False)
        join_df = join_df.replace('Invalid', np.nan)
    
    final_df = join_df.dropna(subset=['level'], how='all')
    final_df['level'] = final_df['level'].astype(str)
    final_df = final_df[['BASIN', 'province', 'district', 'country', 'level', 'geometry']]
    geojson = final_df.to_json()

    # Return as JsonResponse
    return JsonResponse(json.loads(geojson), safe=False)

def get_admin_boundary(request):
    name = request.GET.get("name")
    adm_type = request.GET.get("adm_type")

    if adm_type == 'adm1':
        data = 'static/data/adm1.gpkg'
    elif adm_type == 'adm2':
        data = 'static/data/adm2.gpkg'

    gdf = gpd.read_file(data)

    # Filter the GeoDataFrame by name
    if adm_type == 'adm1':
        gdf = gdf[gdf['country'] == name]
    elif adm_type == 'adm2':
        gdf = gdf[gdf['Province'] == name]

    # Convert the filtered GeoDataFrame to GeoJSON
    geojson = gdf.to_json()
    
    # Return the GeoJSON response
    return JsonResponse(json.loads(geojson), safe=False)

def get_basin_details(request):
    basin_id = request.GET.get("basin")
    data = 'static/data/seaffgs/SEAFFGS_Mekong_XRay_v6.csv'
    df = pd.read_csv()

    # Filter the DataFrame by basin_id
    filtered_df = df[df['ID_CAT'] == basin_id]
    
    # Convert the filtered DataFrame to a dictionary or JSON response
    filtered_data = filtered_df.to_dict(orient='records')
    
    return JsonResponse(filtered_data, safe=False)

