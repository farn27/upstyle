-keepnames class com.example.api.BiMetricsDto
-if class com.example.api.BiMetricsDto
-keep class com.example.api.BiMetricsDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
