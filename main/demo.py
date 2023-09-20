import pandas as pd
import numpy as np
from datetime import datetime

def get_mrcffgs_data_path(date):
    base_path = "static/data"
    date_string = date
    date_object = datetime.strptime(date_string, '%Y-%m-%d')
    year = date_object.year
    data_path = f"{base_path}/{year}/csv/"
    print(data_path)

get_mrcffgs_data_path("2023-01-10")

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

def get_stat_6h():
    """
    This function reads two CSV files, processes the data, and merges the dataframes on the 'BASIN' column.
    It then converts the merged dataframe to a JSON object and prints it.
    """
    static_data_path = 'static/data/ffgs/RoadsPopulation_MKsubcat.csv'
    date = '20200601'
    mrcffgs_data_path = 'static/data/ffgs/mrcffg_'+date+"06.csv"
    df1 = pd.read_csv(static_data_path)
    df1.rename(columns={'value': 'BASIN'}, inplace=True)
    df2 = pd.read_csv(mrcffgs_data_path)
    df2 = df2[["BASIN", "FFG06", "FFFT06"]]
    join_df = df1.merge(df2, on='BASIN', how='inner')
    # scols = join_df[['ISO', 'NAME_1', 'NAME_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'RTP1', 'RTP2', 'RTP3', 'RTP4']]
    scols_ffg = join_df[['ISO', 'NAME_1', 'NAME_2', 'M1', 'M2', 'M3', 'F1', 'F2', 'F3', 'RTP1', 'RTP2', 'RTP3', 'RTP4', 'FFG06']]
    scols_ffft = join_df[['NAME_2', 'FFFT06']]
    grouped_max_FFG = scols_ffg.groupby(['NAME_2']).agg({
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
            'FFG06': 'min',
        }).reset_index()
    grouped_max_FFFT = scols_ffft.groupby(['NAME_2']).agg({'FFFT06': 'max'})
    join_max = grouped_max_FFG.merge(grouped_max_FFFT, on="NAME_2")
    # print(join_max)
    # nan_rows = join_max[join_max['FFG06'].isnull() | join_max['FFFT06'].isnull()]
    # print(nan_rows)
    join_max['Alert_6Hrs'] = join_max.apply(lambda row: assign_alert(row), axis=1)
    final = join_max.dropna(subset=['Alert_6Hrs'], how='all')
    print(final)
    # unique_values = df1['NAME_2'].unique().tolist()
    # print(len(unique_values))
    # join_max.to_csv("/home/asus/Desktop/servir/ffgs/ffgs/static/data/max.csv")
# get_stat_6h()

def get_storm():
    data = 'static/data/storms/MK_storm_monsoon.csv'
    df = pd.read_csv(data)
    scols = df[["Date", "Return_Period"]].copy()
    bins = [0, 10, 50, 500, 1000]
    labels = ['Low', 'Moderate', 'Sever', 'Extreme']
    scols['Category'] = pd.cut(scols["Return_Period"], bins=bins, labels=labels, right=True, ordered=False)
    json = scols.to_json(orient='records')
    print(json)
# get_storm()

# python manage.py shell < ./main/demo.py



# def get_stat():
#     """
#     This function reads two CSV files, processes the data, and merges the dataframes on the 'BASIN' column.
#     It then converts the merged dataframe to a JSON object and prints it.
#     """
#     static_data_path = 'static/data/ffgs/RoadsPopulation_MKsubcat.csv'
#     date = '20200601'
#     mrcffgs_data_path = 'static/data/ffgs/mrcffg_'+date+"06.csv"
#     df1 = pd.read_csv(static_data_path)
#     df1.rename(columns={'value': 'BASIN'}, inplace=True)
#     df2 = pd.read_csv(mrcffgs_data_path)
#     selected_cols_df2 = df2[["BASIN", "FFG06", "FFFT06", "FFR12", "FFR24"]].copy()
#     bins = [-np.inf, 0.01, 0.2, 0.4, 1, np.inf]
#     labels = ['Invalid', 'High', 'Moderate', 'Low', 'Invalid']
#     selected_cols_df2['Alert_6Hrs'] = selected_cols_df2.apply(lambda row: assign_alert(row), axis=1)
#     selected_cols_df2['Risk_12Hrs'] = pd.cut(selected_cols_df2["FFR12"], bins=bins, labels=labels, right=True, ordered=False)
#     selected_cols_df2['Risk_24Hrs'] = pd.cut(selected_cols_df2["FFR24"], bins=bins, labels=labels, right=True, ordered=False)
#     selected_cols_df2 = selected_cols_df2.replace('Invalid', np.nan)
#     final_df2 = selected_cols_df2.dropna(subset=['Alert_6Hrs', 'Risk_12Hrs', 'Risk_24Hrs'], how='all')
#     join_df = df1.merge(final_df2, on='BASIN', how='inner')
#     json = join_df.to_json(orient='records')
# get_stat()



# def get_stat():
#     static_data_path = 'static/data/ffgs/RoadsPopulation_MKsubcat.csv'
#     date = '20200601'
#     mrcffgs_data_path = 'static/data/ffgs/mrcffg_'+date+"06.csv"
#     df1 = pd.read_csv(static_data_path)
#     df1.rename(columns={'value': 'BASIN'}, inplace=True)
#     df2 = pd.read_csv(mrcffgs_data_path)
#     selected_cols_df2 = df2[["BASIN", "FFG06", "FFFT06", "FFR12", "FFR24"]].copy()
#     # bins = [0.01, 0.2, 0.4, 1, np.inf]
#     # labels = ['High Risk', 'Moderate Risk', 'Low Risk']
#     bins = [-np.inf, 0.01, 0.2, 0.4, 1, np.inf]
#     labels = ['Invalid', 'High', 'Moderate', 'Low', 'Invalid']
#     selected_cols_df2['Alert_6Hrs'] = selected_cols_df2.apply(lambda row: assign_alert(row), axis=1)
#     selected_cols_df2['Risk_12Hrs'] = pd.cut(selected_cols_df2["FFR12"], bins=bins, labels=labels, right=True, ordered=False)
#     selected_cols_df2['Risk_24Hrs'] = pd.cut(selected_cols_df2["FFR24"], bins=bins, labels=labels, right=True, ordered=False)
#     # Replace 'Invalid' with np.nan and drop those rows
#     selected_cols_df2 = selected_cols_df2.replace('Invalid', np.nan, inplace=False)
#     # selected_cols_df2['Alert_6Hrs'] = selected_cols_df2.apply(lambda row: assign_alert(row), axis=1)
#     # selected_cols_df2['Risk_12Hrs'] = pd.cut(selected_cols_df2["FFR12"], bins=bins, labels=labels, right=False)
#     # selected_cols_df2['Risk_24Hrs'] = pd.cut(selected_cols_df2["FFR24"], bins=bins, labels=labels, right=False)
#     final_df2 = selected_cols_df2.dropna(subset=['Alert_6Hrs', 'Risk_12Hrs', 'Risk_24Hrs'], how='all', inplace=False)
#     # print(final_df2)
#     join_df = df1.merge(final_df2, on='BASIN', how='inner') # keep only matching records and if how='left' means keep all matching and non matching records in df1
#     # # print(join_df)
#     json = join_df.to_json(orient='records')
#     # print(selected_cols_df2)
# get_stat()

# python manage.py shell < ./main/demo.py




# basin = 'static/data/mekong_mrcffg_basins.geojson'

# def set_color(value, param):
#     # param = "ASMT"
#     if param == "ASMT":
#         if value > 0.01 and value <= 0.65:
#             return '#0000FF'
#         elif value > 0.65 and value <= 0.9:
#             return '#008000'
#         elif value > 0.9 and value <= 1:
#             return '#FFFF00'
#         else:
#             return '#d3d3d3'
#     elif param == "FFG01":
#         return "red"

#     else:
#         return "green"

# @csrf_exempt
# @xframe_options_exempt
# def get_mrcffg_value(request):
#     param = request.GET.get('param')
#     date = '20230825'
#     data = 'static/data/ffgs/mrcffg_'+date+"06.csv"
#     df = pd.read_csv(data)
#     selected_col_df = df[["BASIN", param]]
#     # selected_col_df['color'] = selected_col_df[param].apply(set_color)
#     selected_col_df['color'] = selected_col_df.apply(lambda row: set_color(row[param], param), axis=1)
#     gdf = gpd.read_file(basin)
#     selected_col_gdf = gdf[['value', 'geometry']]
#     selected_col_gdf.rename(columns={'value': 'BASIN'}, inplace=True)
#     fgdf = selected_col_gdf.merge(selected_col_df, on='BASIN', how='left')
    
#     # Define the common color
#     common_color = 'gray'  # Change this to the desired color

#     # Select rows with empty 'color' and set the common color
#     fgdf.loc[fgdf['color'] == '', 'color'] = common_color
#     data = fgdf.to_json()
    
#     return JsonResponse(data, safe=False)


def set_color(value, param):
    # param = "ASMT"
    if param == "ASMT":
        if value > 0.01 and value <= 0.65:
            return '#0000FF'
        elif value > 0.65 and value <= 0.9:
            return '#008000'
        elif value > 0.9 and value <= 1:
            return '#FFFF00'
        else:
            return '#d3d3d3'

def join_csv_shp(param):
    gdf = gpd.read_file(basin)
    df = pd.read_csv(data)
    # print(gdf)
    # print(df)
    # Get the list of columns
    # column_list = gdf.columns.tolist()
    # print(column_list)
    selected_col_gdf = gdf[['value', 'geometry']]
    selected_col_gdf.rename(columns={'value': 'BASIN'}, inplace=True)
    # print(selected_col_gdf)
    selected_col_df = df[['BASIN', param]]
    # column_list = df.columns.tolist()
    # print(column_list)
    # selected_col_df['color'] = selected_col_df[param].apply(set_color)
    selected_col_df['color'] = selected_col_df.apply(lambda row: set_color(row[param], param), axis=1)
    # print(selected_col_df)
    fgdf = selected_col_gdf.merge(selected_col_df, on='BASIN', how='left')
    
    # Define the common color
    common_color = 'gray'  # Change this to the desired color

    # Select rows with empty 'color' and set the common color
    fgdf.loc[fgdf['color'] == '', 'color'] = common_color
    print(fgdf)

# join_csv_shp(param="ASMT")