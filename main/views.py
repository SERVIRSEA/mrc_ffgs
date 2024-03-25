from django.shortcuts import render
from django.views.generic import TemplateView
import pandas as pd
import numpy as np
import geopandas as gpd
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.clickjacking import xframe_options_exempt
from django.conf import settings
from .models import Bulletin
from datetime import datetime
import os
import subprocess
from django.http import FileResponse, HttpResponse

datelist = settings.DATELIST_PATH
seaffgs = settings.SEAFFGS_DATA_PATH
mekongxray = settings.MEKONGXRAY_PATH
events_country = settings.EVENTS_COUNTRYWISE_PATH
storms = settings.STORMS_DATA_PATH

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
    jsonData = final_df.to_json(orient='records')
    # print(jsonData)
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
    json = df.to_json(orient='records')
    # print(json)
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

colors = {
    'yellow': '#FFFF00',
    'lightGreen': '#90EE90',
    'lightBlue': '#ADD8E6',
    'blue': '#0000FF',
    'orange': '#FFA500',
    'red': '#FF0000',
    'deepSkyBlue': '#00BFFF',
    'green': '#008000',
    'violet': '#EE82EE',
    'white': '#FFFFFF'
}

styles = {
    'ASMT': [
        {'min': 0.01, 'max': 0.65, 'color': colors['yellow']},
        {'min': 0.65, 'max': 0.9, 'color': colors['lightGreen']},
        {'min': 0.9, 'max': 1.0, 'color': colors['blue']},
    ],
    # Define other styles...
}

def map_param_to_color(row, param):
    for style_name, rules in styles.items():
        if row[param] >= rules[0]['min'] and (row[param] < rules[-1].get('max', float('inf')) if len(rules) > 1 else True):
            return [rule['color'] for rule in rules][0]

def add_color_column(df, param):
    df['color'] = df.apply(lambda row: map_param_to_color(row, param), axis=1)
    return df

def create_basin_groups(df):
    basin_groups = {}
    for index, row in df.iterrows():
        basin = row['BASIN']
        color = row['color']
        if color not in basin_groups:
            basin_groups[color] = []
        basin_groups[color].append(basin)
    return basin_groups

@csrf_exempt
@xframe_options_exempt
def extract_seaffgs_value(request):
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
    selected_col_with_color = add_color_column(selected_col, param)
    # Creating groups of basins for each color
    basin_groups = create_basin_groups(selected_col_with_color)

    # Now 'basin_groups' contains basins grouped by color
    for color, basins in basin_groups.items():
        print(f"Color: {color}, Basins: {basins}")
    # data = selected_col_with_color.to_json(orient='records')
    # return JsonResponse(data, safe=False)
    return JsonResponse(basin_groups, safe=False)

def generate_sld_content(id_cats_red, id_cats_green, id_cats_yellow):
    red_rules = ''.join([
        f"""
        <Rule>
            <Name>{category}Rule</Name>
            <Title>{category} Polygon</Title>
            <Abstract>A polygon with a red fill for {category}</Abstract>
            <PolygonSymbolizer>
                <Fill>
                    <CssParameter name="fill">#FF0000</CssParameter>
                </Fill>
            </PolygonSymbolizer>
            <ogc:Filter>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>ID_CAT</ogc:PropertyName>
                    <ogc:Literal>{category}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
            </ogc:Filter>
        </Rule>
        """ for category in id_cats_red
    ])

    green_rules = ''.join([
        f"""
        <Rule>
            <Name>{category}Rule</Name>
            <Title>{category} Polygon</Title>
            <Abstract>A polygon with a red fill for {category}</Abstract>
            <PolygonSymbolizer>
                <Fill>
                    <CssParameter name="fill">#00FFFF</CssParameter>
                </Fill>
            </PolygonSymbolizer>
            <ogc:Filter>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>ID_CAT</ogc:PropertyName>
                    <ogc:Literal>{category}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
            </ogc:Filter>
        </Rule>
        """ for category in id_cats_green
    ])

    yellow_rules = ''.join([
        f"""
        <Rule>
            <Name>{category}Rule</Name>
            <Title>{category} Polygon</Title>
            <Abstract>A polygon with a yellow fill for {category}</Abstract>
            <PolygonSymbolizer>
                <Fill>
                    <CssParameter name="fill">#FFFF00</CssParameter>
                </Fill>
            </PolygonSymbolizer>
            <ogc:Filter>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>ID_CAT</ogc:PropertyName>
                    <ogc:Literal>{category}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
            </ogc:Filter>
        </Rule>
        """ for category in id_cats_yellow
    ])

    # print("Red Rules:", red_rules)
    # print("Green Rules:", green_rules)
    # print("Yellow Rules:", yellow_rules)

    sld_content = f"""
    <?xml version="1.0" encoding="UTF-8"?>
    <StyledLayerDescriptor version="1.0.0" 
        xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" 
        xmlns="http://www.opengis.net/sld" 
        xmlns:ogc="http://www.opengis.net/ogc" 
        xmlns:xlink="http://www.w3.org/1999/xlink" 
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <!-- a Named Layer is the basic building block of an SLD document -->
        <NamedLayer>
            <Name>mrc_basin_v2</Name>
            <UserStyle>
                <!-- Styles can have names, titles, and abstracts -->
                <Title>Default Polygon</Title>
                <Abstract>A sample style that draws a polygon</Abstract>
                <!-- FeatureTypeStyles describe how to render different features -->
                <!-- A FeatureTypeStyle for rendering polygons -->
                <FeatureTypeStyle>
                    {green_rules}
                    {yellow_rules}
                </FeatureTypeStyle>
            </UserStyle>
        </NamedLayer>
    </StyledLayerDescriptor>
    """
    return sld_content

# def generate_sld_content(categories_by_group):
#     colors = ['#FF0000', '#00FF00', '#0000FF']  # Example colors: Red, Green, Blue

#     rules = ''
#     for i, category_group in enumerate(categories_by_group):
#         # Construct the list of literal values for the PropertyIsIn filter
#         literal_values = ''.join([f"<ogc:Literal>{category}</ogc:Literal>" for category in category_group])

#         # Use a different color for each group
#         color = colors[i]

#         rules += f"""
#             <Rule>
#                 <Name>Group{i+1}Rule</Name>
#                 <Title>Group {i+1} Polygon</Title>
#                 <Abstract>A polygon with a {color} fill for group {i+1}</Abstract>
#                 <PolygonSymbolizer>
#                     <Fill>
#                         <CssParameter name="fill">{color}</CssParameter>
#                     </Fill>
#                 </PolygonSymbolizer>
#                 <ogc:Filter>
#                     <ogc:PropertyIsIn>
#                         <ogc:PropertyName>ID_CAT</ogc:PropertyName>
#                         {literal_values}
#                     </ogc:PropertyIsIn>
#                 </ogc:Filter>
#             </Rule>
#             """

#     sld_content = f"""
#     <?xml version="1.0" encoding="UTF-8"?>
#     <StyledLayerDescriptor version="1.1.1"
#         xmlns="http://www.opengis.net/sld"
#         xmlns:ogc="http://www.opengis.net/ogc"
#         xmlns:xlink="http://www.w3.org/1999/xlink"
#         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
#         xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd">
#         <NamedLayer>
#             <Name>YourLayerName</Name>
#             <UserStyle>
#                 <Title>Custom Polygon</Title>
#                 <Abstract>A sample style that draws a polygon</Abstract>
#                 <FeatureTypeStyle>
#                     {rules}
#                 </FeatureTypeStyle>
#             </UserStyle>
#         </NamedLayer>
#     </StyledLayerDescriptor>
#     """
#     return sld_content


@csrf_exempt
@xframe_options_exempt
def generate_sld(request):
    red_cats = ["2054245454", "2054245704"]
    green_cats = ["2054247047", "2054247063"]
    yellow_cats = ["2054245431", "2054245209", "2055740499", "2055740508" ]
    # id_cats = ["2054245454", "2054245704"]
    id_cats = [
        "2055739754", "2055739760", "2055740326", "2055740327"   
    ]
    sld_content = generate_sld_content(id_cats_red=red_cats, id_cats_green=id_cats, id_cats_yellow=yellow_cats)
    
    # categories_group1 = ["2055739754", "2055739760", "2055740326"]  # Example categories in group 1
    # categories_group2 = ["2055740327", "2055740499", "2055740508"]  # Example categories in group 2
    # categories_group3 = ["2055740510", "2055740513", "2055740514"]  # Example categories in group 3

    # categories_by_group = [categories_group1, categories_group2, categories_group3]

    # sld_content = generate_sld_content(categories_by_group)
    
    # id_cats = ["2054245454", "2054245704"]
    # sld_content = generate_sld_content(id_cats)
    # # Get filter parameters from the request
    # filter_param = request.GET.get('filter_param')

    # # Generate your SLD here dynamically based on the filter parameter
    # # For simplicity, let's assume the filter parameter is used to change the fill color
    # if filter_param == 'value1':
    #     fill_color = '#FF0000'  # Red color
    # elif filter_param == 'value2':
    #     fill_color = '#00FF00'  # Green color
    # else:
    # #     fill_color = '#0000FF'  # Blue color
    # fill_color = '#7EFD81'

    # # Construct the SLD content with the dynamic fill color
    # sld_content = f"""
    #     <?xml version="1.0" encoding="UTF-8"?>
    #         <StyledLayerDescriptor version="1.0.0" 
    #         xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" 
    #         xmlns="http://www.opengis.net/sld" 
    #         xmlns:ogc="http://www.opengis.net/ogc" 
    #         xmlns:xlink="http://www.w3.org/1999/xlink" 
    #         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    #         <!-- a Named Layer is the basic building block of an SLD document -->
    #         <NamedLayer>
    #             <Name>mrc_basin_v2</Name>
    #             <UserStyle>
    #             <!-- Styles can have names, titles and abstracts -->
    #             <Title>Default Polygon</Title>
    #             <Abstract>A sample style that draws a polygon</Abstract>
    #             <!-- FeatureTypeStyles describe how to render different features -->
    #             <!-- A FeatureTypeStyle for rendering polygons -->
    #             <FeatureTypeStyle>
    #                 <Rule>
    #                 <Name>rule1</Name>
    #                 <Title>Gray Polygon with Black Outline</Title>
    #                 <Abstract>A polygon with a gray fill and a 1 pixel black outline</Abstract>
    #                 <PolygonSymbolizer>
    #                     <Fill>
    #                     <CssParameter name="fill">{fill_color}</CssParameter>
    #                     </Fill>
    #                     <Stroke>
    #                     <CssParameter name="stroke">#000000</CssParameter>
    #                     <CssParameter name="stroke-width">1</CssParameter>
    #                     </Stroke>
    #                 </PolygonSymbolizer>
    #                 </Rule>
    #             </FeatureTypeStyle>
    #             </UserStyle>
    #         </NamedLayer>
    #     </StyledLayerDescriptor>
    # """

    
    # Example usage:
    # id_cats = ["2054245454", "2054245704"]
    # sld_content = generate_sld_content(id_cats)
    # Return the SLD content as an XML response
    response = HttpResponse(sld_content, content_type='application/xml')
    return response