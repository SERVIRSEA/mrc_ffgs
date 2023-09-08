from django.urls import path
from . import views

urlpatterns = [
    path('', views.HomePage.as_view(), name='home'),
    path('bulletin/', views.BulletinPage.as_view(), name='bulletin'),
    path('get-mrcffg-bulletin-map-data/', views.get_mrcffg_bulletin_data),
    path('get_mrcffg_value/', views.get_mrcffg_value),
    path('get-alert-stat-6hrs/', views.get_alert_stat_6hrs),
    path('get-risk-stat-12hrs/', views.get_risk_stat_12hrs),
    path('get-risk-stat-24hrs/', views.get_risk_stat_24hrs),
    path('get-storms/', views.get_storms),
    path('get-storms-number-by-country/', views.get_storms_number_by_country)
]
