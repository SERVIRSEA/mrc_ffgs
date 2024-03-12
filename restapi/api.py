import os
import json
import pandas as pd
import numpy as np
import geopandas as gpd
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from main.authentication import APIKeyAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ParseError

from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from datetime import datetime
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from main.models import Bulletin
from main.serializers import BulletinSerializer
from main.models import Bulletin

#=========== Drought API for Dashboard ======================>
@swagger_auto_schema(
    method='get',
    operation_summary="Get Drought Stats.",
    manual_parameters=[
        openapi.Parameter('index', openapi.IN_QUERY, description="Index of the stats (spi, cdi, iswf)", type=openapi.TYPE_STRING),
        openapi.Parameter('date', openapi.IN_QUERY, description="Date of the stats (yyyy-mm-dd)", type=openapi.TYPE_STRING),
        openapi.Parameter('stats_type', openapi.IN_QUERY, description="Type of stats (gdp, population, crop damage)", type=openapi.TYPE_STRING),
        openapi.Parameter('area_id', openapi.IN_QUERY, description="Id of requested area (mekong, subprovince name)", type=openapi.TYPE_STRING),
    ],
    responses={200: 'OK - Successful response'}
)

@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
# @permission_classes([IsAuthenticated])
def get_drought_stats(request):
    """
    Get Drought Stats.

    Parameters:
    - index: Index of the stats (spi, cdi, iswf)
    - date: Date of the stats (yyyy-mm-dd)
    - stats_type: Type of stats (gdp, population, crop damage)
    - area_id: Id of requested area (mekong, subprovince name)

    Returns:
    - JSON: Drought statistics based on the provided parameters.
    """
    try:
        index = request.GET.get('index')
        date = request.GET.get('date')
        stats_type = request.GET.get('stats_type')
        area_id = request.GET.get('area_id')
        
        # Check if required parameters are missing
        if not all([index, date, stats_type, area_id]):
            raise ParseError("Missing required parameters")

        data_path = f'{settings.DROUGHT_STAT_DATA_PATH}/drought_spi_gdp_mk.csv'
        df = pd.read_csv(data_path)
        
        # Convert the filtered DataFrame to JSON
        json_data = df.to_dict(orient='records')
        
        return Response({
            "status": "success",
            "data": json_data
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)

#=============== API for SEAFFGS =================>

datelist = settings.DATELIST_PATH
seaffgs = settings.SEAFFGS_DATA_PATH
mekongxray = settings.MEKONGXRAY_PATH
events_country = settings.EVENTS_COUNTRYWISE_PATH
storms = settings.STORMS_DATA_PATH

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

@swagger_auto_schema(
    method='get',
    operation_summary="Get Date List.",
    responses={200: 'OK - Successful response'},
)

@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
# @permission_classes([IsAuthenticated])
def get_date_list(request):
    """
    Get Date List.

    Returns:
    - JSON: List of dates in JSON format.
    """
    try:
        data = datelist  # Assuming datelist is defined somewhere in your code
        df = pd.read_csv(data, header=None, encoding='utf-8-sig')
        json_data = df.to_json(orient='values')
        # json_data = df.to_dict(orient='records')
        return Response({
            "status": "success",
            "data": json_data
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)


@swagger_auto_schema(
    method='get',
    operation_summary="Endpoint to retrieve seaffgs value for a given parameter and date.",
    manual_parameters=[
        openapi.Parameter('param', in_=openapi.IN_QUERY, description='The parameter for which seaffgs value is requested.', type=openapi.TYPE_STRING),
        openapi.Parameter('date', in_=openapi.IN_QUERY, description='The date for which the seaffgs value is requested (format: YYYY-MM-DD).', type=openapi.TYPE_STRING),
        openapi.Parameter('hrs', in_=openapi.IN_QUERY, description='The hour for which the seaffgs value is requested.', type=openapi.TYPE_STRING),
    ],
    responses={200: 'OK - Successful response'}
)

@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
# @permission_classes([IsAuthenticated])
def get_seaffgs_value(request):
    """
    Endpoint to retrieve seaffgs value for a given parameter and date.

    Returns:
    - JSON: Sea surface value in JSON format.
    """
    try:
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
        json_data = selected_col.to_json(orient='records')
        # json_data = selected_col.to_dict(orient='records')
        return Response({
            "status": "success",
            "data": json_data
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)

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

@swagger_auto_schema(
    method='get',
    operation_summary="Get Alert Statistics for 6 hours.",
    manual_parameters=[
        openapi.Parameter('date', in_=openapi.IN_QUERY, description='The date for which the data is requested (format: YYYY-MM-DD).', type=openapi.TYPE_STRING),
        openapi.Parameter('hrs', in_=openapi.IN_QUERY, description='The hour for which the data is requested.', type=openapi.TYPE_STRING),
    ],
    responses={200: openapi.Response(description='OK - Successful response')}
)
@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
# @permission_classes([IsAuthenticated])
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

    :rtype: Response
    """
    try:
        static_data_path = mekongxray
        date_str = request.GET.get("date")
        formatted_date = date_str.replace("-", "")
        hrs = request.GET.get("hrs")
        get_data_path = get_seaffgs_data_path(date_str)
        seaffgs_data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
        df1 = pd.read_csv(static_data_path)
        df1[int_columns] = df1[int_columns].astype(int)
        df1[float_columns] = df1[float_columns].astype(float)
        df1[float_round_0_cols] = df1[float_round_0_cols].round(0)
        df1[float_round_2_cols] = df1[float_round_2_cols].round(2)
        df1.rename(columns={'value': 'BASIN'}, inplace=True)
        df2 = pd.read_csv(seaffgs_data_path)
        filtered_df2 = df2[selected_columns] 
        renamed_cols2 = filtered_df2.rename(columns=rename_mapping)
        s_df2 = renamed_cols2[["BASIN", "FFG06", "FFFT06"]]
        join_df = df1.merge(s_df2, on='BASIN', how='inner')
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
        json_data = final_df.to_json(orient='records')
        return Response({
            "status": "success",
            "data": json_data
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)

@swagger_auto_schema(
    method='get',
    operation_summary="Get Risk Statistics for 12 hours.",
    manual_parameters=[
        openapi.Parameter('date', in_=openapi.IN_QUERY, description='The date for which the data is requested (format: YYYY-MM-DD).', type=openapi.TYPE_STRING),
        openapi.Parameter('hrs', in_=openapi.IN_QUERY, description='The hour for which the data is requested.', type=openapi.TYPE_STRING),
    ],
    responses={200: openapi.Response(description='OK - Successful response')}
)
@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
# @permission_classes([IsAuthenticated])
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

        :rtype: Response
    """
    try:
        static_data_path = mekongxray
        date_str = request.GET.get("date")
        formatted_date = date_str.replace("-", "")
        hrs = request.GET.get("hrs")
        get_data_path = get_seaffgs_data_path(date_str)
        seaffgs_data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
        df1 = pd.read_csv(static_data_path)
        df1[int_columns] = df1[int_columns].astype(int)
        df1[float_columns] = df1[float_columns].astype(float)
        df1[float_round_0_cols] = df1[float_round_0_cols].round(0)
        df1[float_round_2_cols] = df1[float_round_2_cols].round(2)
        df1.rename(columns={'value': 'BASIN'}, inplace=True)
        df2 = pd.read_csv(seaffgs_data_path)
        filtered_df2 = df2[selected_columns] 
        renamed_cols2 = filtered_df2.rename(columns=rename_mapping)
        s_df2 = renamed_cols2[["BASIN", "FFR12"]]
        join_df = df1.merge(s_df2, on='BASIN', how='inner')
        scols = join_df[['ISO', 'ID_2', 'NAME_1', 'NAME_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'RTP1', 'RTP2', 'RTP3', 'RTP4', 'Hospital', 'GDP', 'crop_sqm', 'FFR12']]
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
        json_data = final_df.to_json(orient='records')
        return Response({
                "status": "success",
                "data": json_data
            })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)

@swagger_auto_schema(
    method='get',
    operation_summary="Get Risk Statistics for 24 hours.",
    manual_parameters=[
        openapi.Parameter('date', in_=openapi.IN_QUERY, description='The date for which the data is requested (format: YYYY-MM-DD).', type=openapi.TYPE_STRING),
        openapi.Parameter('hrs', in_=openapi.IN_QUERY, description='The hour for which the data is requested.', type=openapi.TYPE_STRING),
    ],
    responses={200: openapi.Response(description='OK - Successful response')}
)
@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
# @permission_classes([IsAuthenticated])
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

        :rtype: Response
    """
    try:
        static_data_path = mekongxray
        date_str = request.GET.get("date")
        formatted_date = date_str.replace("-", "")
        hrs = request.GET.get("hrs")
        get_data_path = get_seaffgs_data_path(date_str)
        seaffgs_data_path = f'{get_data_path}/{formatted_date}{hrs}.csv.gz'
        df1 = pd.read_csv(static_data_path)
        df1[int_columns] = df1[int_columns].astype(int)
        df1[float_columns] = df1[float_columns].astype(float)
        df1[float_round_0_cols] = df1[float_round_0_cols].round(0)
        df1[float_round_2_cols] = df1[float_round_2_cols].round(2)
        df1.rename(columns={'value': 'BASIN'}, inplace=True)
        df2 = pd.read_csv(seaffgs_data_path)
        filtered_df2 = df2[selected_columns] 
        renamed_cols2 = filtered_df2.rename(columns=rename_mapping)
        s_df2 = renamed_cols2[["BASIN", "FFR24"]]
        join_df = df1.merge(s_df2, on='BASIN', how='inner')
        scols = join_df[['ISO', 'ID_2', 'NAME_1', 'NAME_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'RTP1', 'RTP2', 'RTP3', 'RTP4', 'Hospital', 'GDP', 'crop_sqm', 'FFR24']]
        grouped_max = scols.groupby(['NAME_2']).agg({
            'ISO': 'first',
            'ID_2': 'first',
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
        json_data = final_df.to_json(orient='records')
        return Response({
                "status": "success",
                "data": json_data
            })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)