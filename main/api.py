from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from .authentication import APIKeyAuthentication
from rest_framework.permissions import IsAuthenticated
import pandas as pd
import numpy as np
import geopandas as gpd
from django.conf import settings
from .models import Bulletin
from datetime import datetime
import os
from django.views.decorators.csrf import csrf_exempt
from .models import Bulletin
from .serializers import BulletinSerializer

datelist = settings.DATELIST_PATH
mrcffgs = settings.MRCFFGS_PATH
mekongxray = settings.MEKONGXRAY_PATH
events_country = settings.EVENTS_COUNTRYWISE_PATH
storms = settings.STORMS_DATA_PATH

def get_mrcffgs_data_path(date_string):
    base_path = mrcffgs
    date_object = datetime.strptime(date_string, '%Y-%m-%d')
    year = date_object.year
    data_path = f"{base_path}/{year}/csv/"
    return data_path

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
@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
# @permission_classes([IsAuthenticated])
def mrcffgs_api(request):
    action = request.query_params.get('action', '')

    static_data_path = mekongxray

    if action:
        request_methods = [
            'get-date-list',
            'get-bulletin-summary',
            'get-stat-6hrs',
            'get-stat-12hrs',
            'get-stat-24hrs'
        ]

        if action in request_methods:
            param = request.query_params.get('param', '')
            date_str = request.query_params.get('date', '')
            hrs = request.query_params.get('hrs', '')
            formatted_date = date_str.replace('-', '')

            if action == 'get-date-list':
                data = datelist
                df = pd.read_csv(data, header=None, encoding='utf-8-sig')
                json = df.to_json(orient='values')
                return Response(json)
   
            elif action == 'get-bulletin-summary':
                bulletin = Bulletin.objects.order_by('-created_at').first()
                serializer = BulletinSerializer(bulletin)
                return Response(serializer.data)
            
            elif action == 'get-stat-6hrs':
                try:
                    get_data_path = get_mrcffgs_data_path(date_str)
                    mrcffgs_data_path = get_data_path+"mrcffg_"+formatted_date+hrs+".csv"
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
                    return Response(json)
                except FileNotFoundError:
                    return Response({"error": "Data not found"}, status=404)

            elif action == 'get-stat-12hrs':
                get_data_path = get_mrcffgs_data_path(date_str)
                mrcffgs_data_path = get_data_path+"mrcffg_"+formatted_date+hrs+".csv"
                df1 = pd.read_csv(static_data_path)
                df1[int_columns] = df1[int_columns].astype(int)
                df1[float_columns] = df1[float_columns].astype(float)
                df1[float_round_0_cols] = df1[float_round_0_cols].round(0)
                df1[float_round_2_cols] = df1[float_round_2_cols].round(2)
                df1.rename(columns={'value': 'BASIN'}, inplace=True)
                df2 = pd.read_csv(mrcffgs_data_path)
                df2 = df2[["BASIN", "FFR12"]]
                join_df = df1.merge(df2, on='BASIN', how='inner')
                scols = join_df[['ID_2', 'ISO', 'NAME_1', 'NAME_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'RTP1', 'RTP2', 'RTP3', 'RTP4', 'Hospital', 'GDP', 'crop_sqm', 'FFR12']]
                grouped_max = scols.groupby(['NAME_2']).agg({
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
                    'FFR12': 'min',
                }).reset_index()
                bins = [-np.inf, 0.01, 0.2, 0.4, 1, np.inf]
                labels = ['Invalid', 'High', 'Moderate', 'Low', 'Invalid']
                grouped_max['Risk_12Hrs'] = pd.cut(grouped_max["FFR12"], bins=bins, labels=labels, right=True, ordered=False)
                grouped_max = grouped_max.replace('Invalid', np.nan)
                final_df = grouped_max.dropna(subset=['Risk_12Hrs'], how='all')
                json = final_df.to_json(orient='records')
                return Response(json)

            elif action == 'get-stat-24hrs':
                get_data_path = get_mrcffgs_data_path(date_str)
                mrcffgs_data_path = get_data_path+"mrcffg_"+formatted_date+hrs+".csv"
                df1 = pd.read_csv(static_data_path)
                df1[int_columns] = df1[int_columns].astype(int)
                df1[float_columns] = df1[float_columns].astype(float)
                df1[float_round_0_cols] = df1[float_round_0_cols].round(0)
                df1[float_round_2_cols] = df1[float_round_2_cols].round(2)
                df1.rename(columns={'value': 'BASIN'}, inplace=True)
                df2 = pd.read_csv(mrcffgs_data_path)
                df2 = df2[["BASIN", "FFR24"]]
                join_df = df1.merge(df2, on='BASIN', how='inner')
                scols = join_df[['ID_2', 'ISO', 'NAME_1', 'NAME_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'RTP1', 'RTP2', 'RTP3', 'RTP4', 'Hospital', 'GDP', 'crop_sqm', 'FFR24']]
                grouped_max = scols.groupby(['NAME_2']).agg({
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
                    'FFR24': 'min',
                }).reset_index()
                bins = [-np.inf, 0.01, 0.2, 0.4, 1, np.inf]
                labels = ['Invalid', 'High', 'Moderate', 'Low', 'Invalid']
                grouped_max['Risk_24Hrs'] = pd.cut(grouped_max["FFR24"], bins=bins, labels=labels, right=True, ordered=False)
                grouped_max = grouped_max.replace('Invalid', np.nan)
                final_df = grouped_max.dropna(subset=['Risk_24Hrs'], how='all')
                json = final_df.to_json(orient='records')
                return Response(json)
    return Response({"error": "Invalid or no action provided."}, status=400)

# def get_mrcffgs_data_path(date_string):
#     base_path = mrcffgs
#     date_object = datetime.strptime(date_string, '%Y-%m-%d')
#     year = date_object.year
#     data_path = f"{base_path}/{year}/csv/"
#     return data_path

# def get_mrcffg_value(request):
#     param = request.GET.get('param')
#     date_str = request.GET.get("date")
#     formatted_date = date_str.replace("-", "")
#     hrs = request.GET.get("hrs")
#     get_data_path = get_mrcffgs_data_path(date_str)
#     data = get_data_path+"mrcffg_"+formatted_date+hrs+".csv"
#     df = pd.read_csv(data)
#     selected_col = df[["BASIN", param]]
#     data = selected_col.to_json(orient='records')
#     return Response(data)


# def get_mrcffg_bulletin_data(request):
#     # Your logic from get_mrcffg_bulletin_data
#     date_str = request.GET.get("date")
#     # ... and so on, till the end
#     data = selected_col.to_json(orient='records')
#     return Response(data)


# def get_alert_stat_6hrs(request):
#     # Your logic from get_alert_stat_6hrs
#     static_data_path = mekongxray
#     # ... and so on, till the end
#     json = final_df.to_json(orient='records')
#     return Response(json)