from django.urls import path
from . import api

urlpatterns = [
    path('v1/seaffgs/get-date-list/', api.get_date_list),
    path('v1/seaffgs/get-value/', api.get_seaffgs_value),
    path('v1/seaffgs/get-risk-6hrs/', api.get_alert_stat_6hrs),
    path('v1/seaffgs/get-risk-12hrs/', api.get_risk_stat_12hrs),
    path('v1/seaffgs/get-risk-24hrs/', api.get_risk_stat_24hrs),
    path('v1/dashboard/get-drought-stats/', api.get_drought_stats),
    path('v1/seaffgs/get-risk-map/', api.get_risk_map)
]
