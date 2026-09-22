-keepnames class com.example.api.HrDataDto
-if class com.example.api.HrDataDto
-keep class com.example.api.HrDataDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
