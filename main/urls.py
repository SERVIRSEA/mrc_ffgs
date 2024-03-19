from django.urls import path
from . import views

urlpatterns = [
    path('', views.HomePage.as_view(), name='home'),
    path('map/', views.MapPage.as_view(), name='map'),
    path('bulletin/', views.BulletinPage.as_view(), name='bulletin'),
    path('get-datelist/', views.get_datelist),
    path('get-hourlist/', views.get_hours),
    path('get-seaffgs-bulletin-map-data/', views.get_seaffgs_bulletin_data),
    path('get-seaffgs-value/', views.get_seaffgs_value),
    path('get-alert-stat-6hrs/', views.get_alert_stat_6hrs),
    path('get-risk-stat-12hrs/', views.get_risk_stat_12hrs),
    path('get-risk-stat-24hrs/', views.get_risk_stat_24hrs),
    path('get-storms/', views.get_storms),
    path('get-storms-number-by-country/', views.get_storms_number_by_country),
    path('get-basin-chart-data/', views.get_basin_chart),
    path('pdf-template/', views.pdf_template_view, name='pdf-template'),
    path('get-sld/', views.generate_sld, name='get-sld'),
    path('extract/', views.extract_seaffgs_value),
]

# http://127.0.0.1:8000/mrcffgs/?action=get-mrcffg-value