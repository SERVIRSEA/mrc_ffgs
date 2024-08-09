import os
import json
import pandas as pd
import numpy as np
import geopandas as gpd
import dask_geopandas as dgpd
import orjson
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from main.authentication import APIKeyAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ParseError
from shapely.geometry import mapping
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
        # openapi.Parameter('date', openapi.IN_QUERY, description="Date of the stats (yyyy-mm-dd)", type=openapi.TYPE_STRING),
        # openapi.Parameter('stats_type', openapi.IN_QUERY, description="Type of stats (gdp, population, crop damage)", type=openapi.TYPE_STRING),
        # openapi.Parameter('area_id', openapi.IN_QUERY, description="Id of requested area (mekong, subprovince name)", type=openapi.TYPE_STRING),
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
    # - date: Date of the stats (yyyy-mm-dd)
    # - stats_type: Type of stats (gdp, population, crop damage)
    # - area_id: Id of requested area (mekong, subprovince name)

    Returns:
    - JSON: Drought statistics based on the provided parameters.
    """
    try:
        index = request.GET.get('index')
        # date = request.GET.get('date')
        # stats_type = request.GET.get('stats_type')
        # area_id = request.GET.get('area_id')
        
        # Check if required parameters are missing
        if not all([index]): # , date, stats_type, area_id
            raise ParseError("Missing required parameters")
        index = index.upper()
        data_path = f'{settings.DROUGHT_STAT_DATA_PATH}/{index}_impact.csv'
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
basin_attr = settings.BASIN_ATTR_PATH

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
        data = datelist
        df = pd.read_csv(data, header=None, encoding='utf-8-sig')
        # Sort the DataFrame by the date column in descending order
        df = df.sort_values(by=0, ascending=False)
        json = df.to_json(orient='values')
        return Response({
            "status": "success",
            "data": json
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
        # json_data = selected_col.to_json(orient='records')
        dict_data = selected_col.to_dict(orient='records')
        return Response({
            "status": "success",
            "data": dict_data
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)
    

def assign_alert(row):
    # Check for invalid values
    if row['FFG06'] < 0:
        return np.nan

    # High alert
    if 0 < row['FFG06'] <= 15:
        return 'High'
    # Moderate alert
    elif 15 < row['FFG06'] <= 30:
        return 'Moderate'
    # Low alert
    elif 30 < row['FFG06'] <= 60:
        return 'Low'
    # Anything else
    else:
        return np.nan

int_columns = ['ID_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'Hospital']
float_columns = ['RTP1', 'RTP2', 'RTP3', 'RTP4', 'GDP', 'crop_sqm']
float_round_0_cols = ['GDP', 'crop_sqm']
float_round_2_cols = ['RTP1', 'RTP2', 'RTP3', 'RTP4']

def assign_alert_1hrs(row):
    if row['FFG01'] < 0:
        return np.nan
    elif 0 < row['FFG01'] <= 10:
        return 'High'
    elif row['FFG01'] <= 25:
        return 'Moderate'
    elif row['FFG01'] <= 40:
        return 'Low'
    else:
        return np.nan

def assign_alert_3hrs(row):
    if row['FFG03'] < 0:
        return np.nan
    elif 0 < row['FFG03'] <= 10:
        return 'High'
    elif row['FFG03'] <= 25:
        return 'Moderate'
    elif row['FFG03'] <= 40:
        return 'Low'
    else:
        return np.nan

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
            'FFG06': 'min',
        }).reset_index()
        grouped_max_FFFT = scols_ffft.groupby(['NAME_2']).agg({'FFFT06': 'max'})
        join_max = grouped_max_FFG.merge(grouped_max_FFFT, on="NAME_2")
        join_max['Alert_6Hrs'] = join_max.apply(lambda row: assign_alert(row), axis=1)
        final_df = join_max.dropna(subset=['Alert_6Hrs'], how='all')
        final_df = final_df.rename(columns={'Alert_6Hrs': 'Level'})
        # Sort by 'NAME_1' and then 'NAME_2'
        final_df = final_df.sort_values(by=['NAME_1', 'NAME_2', 'Level'])
        # json = final_df.to_json(orient='records')
        dict_data = final_df.to_dict(orient='records')
        return Response({
            "status": "success",
            "data": json
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
        
        bins = [-np.inf, 0.01, 0.35, 0.75, 1, np.inf]
        labels = ['Invalid', 'Low', 'Moderate', 'High', 'Invalid']
        grouped_max['Risk_12Hrs'] = pd.cut(grouped_max["FFR12"], bins=bins, labels=labels, right=True, ordered=False)
        grouped_max = grouped_max.replace('Invalid', np.nan)
        final_df = grouped_max.dropna(subset=['Risk_12Hrs'], how='all')
        final_df = final_df.rename(columns={'Risk_12Hrs': 'Level'})
        # Sort by 'NAME_1' and then 'NAME_2'
        final_df = final_df.sort_values(by=['NAME_1', 'NAME_2', 'Level'])
        # json = final_df.to_json(orient='records')
        dict_data = final_df.to_dict(orient='records')
        return Response({
                "status": "success",
                "data": dict_data
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
        
        bins = [-np.inf, 0.01, 0.35, 0.75, 1, np.inf]
        labels = ['Invalid', 'Low', 'Moderate', 'High', 'Invalid']
        grouped_max['Risk_24Hrs'] = pd.cut(grouped_max["FFR24"], bins=bins, labels=labels, right=True, ordered=False)
        
        grouped_max = grouped_max.replace('Invalid', np.nan)
        
        final_df = grouped_max.dropna(subset=['Risk_24Hrs'], how='all')
        
        final_df = final_df.rename(columns={'Risk_24Hrs': 'Level'})
        # Sort by 'NAME_1' and then 'NAME_2'
        final_df = final_df.sort_values(by=['NAME_1', 'NAME_2', 'Level'])
        # json = final_df.to_json(orient='records')
        dict_data = final_df.to_dict(orient='records')
        return Response({
                "status": "success",
                "data": dict_data
            })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)

@swagger_auto_schema(
    method='get',
    operation_summary="Get Risk Map Data.",
    manual_parameters=[
        openapi.Parameter('param', in_=openapi.IN_QUERY, description='The parameter to be used for risk assessment. Valid values are: FFR12, FFR24.', type=openapi.TYPE_STRING, enum=['FFR12', 'FFR24']),
        openapi.Parameter('date', in_=openapi.IN_QUERY, description='The date for which the data is requested (format: YYYY-MM-DD).', type=openapi.TYPE_STRING),
        openapi.Parameter('hr', in_=openapi.IN_QUERY, description='The hour for which the data is requested.', type=openapi.TYPE_STRING),
    ],
    responses={
        200: openapi.Response(description='OK - Successful response with risk map data', schema=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'status': openapi.Schema(type=openapi.TYPE_STRING),
                'date': openapi.Schema(type=openapi.TYPE_STRING),
                'hour': openapi.Schema(type=openapi.TYPE_STRING),
                'returned_time': openapi.Schema(type=openapi.TYPE_STRING),
                'data': openapi.Schema(type=openapi.TYPE_OBJECT)
            }
        )),
        400: openapi.Response(description='Bad Request - Invalid input or missing parameters'),
        404: openapi.Response(description='Not Found - Data not found'),
        500: openapi.Response(description='Internal Server Error - Something went wrong'),
    }
)
@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
# @permission_classes([IsAuthenticated])
def get_risk_map(request):
    """
    Receives an HTTP request, reads basin and parameter data from CSV and parquet files, categorizes the parameter data,
    merges the two dataframes on the 'BASIN' column, and returns the merged dataframe in JSON format.

    The dataframe is modified to replace 'Invalid' values with NaN and drop rows where all risk categories are NaN.
    The result is converted to GeoJSON format and returned.

    :valid parms = ['FFR12', 'FFR24']
    :param request: HTTP request
    :return: Response containing merged dataframe in JSON format
    :rtype: Response
    """
    try:
        static_data_path = 'static/data/basins_with_attr.parquet'
        param = request.GET.get("param")
        date_str = request.GET.get("date")
        formatted_date = date_str.replace("-", "")
        hr = request.GET.get("hr")
        get_data_path = get_seaffgs_data_path(date_str)
        seaffgs_data_path = f'{get_data_path}/{formatted_date}{hr}.csv.gz'
        
        # Read the static data using Dask GeoPandas
        df1 = dgpd.read_parquet(static_data_path).compute()
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
            bins = [-np.inf, 0.01, 0.35, 0.75, 1, np.inf]
            labels = ['Invalid', 'Low', 'Moderate', 'High', 'Invalid']
            join_df['level'] = pd.cut(join_df[param], bins=bins, labels=labels, right=True, ordered=False)
            join_df = join_df.replace('Invalid', np.nan)
        
        final_df = join_df.dropna(subset=['level'], how='all')
        final_df['level'] = final_df['level'].astype(str)
        final_df = final_df.rename(columns={param: 'value'})
        final_df = final_df[['BASIN', 'value', 'province', 'district', 'country', 'level', 'geometry']]
        geojson = final_df.to_json()
        
        # Get current time for returned_time
        returned_time = datetime.utcnow().isoformat()

        return Response({
            "status": "success",
            "date": date_str,
            "hour": hr,
            "returned_time": returned_time,
            "data": orjson.loads(geojson)
        })
    
    except FileNotFoundError as e:
        return Response({
            "status": "error",
            "message": f"File not found: {str(e)}"
        }, status=404)
    
    except pd.errors.EmptyDataError as e:
        return Response({
            "status": "error",
            "message": f"Empty data error: {str(e)}"
        }, status=400)
    
    except pd.errors.ParserError as e:
        return Response({
            "status": "error",
            "message": f"Parsing error: {str(e)}"
        }, status=400)
    
    except Exception as e:
        return Response({
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}"
        }, status=500)