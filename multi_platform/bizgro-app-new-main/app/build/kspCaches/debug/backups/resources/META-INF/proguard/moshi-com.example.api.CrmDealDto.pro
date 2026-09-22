-keepnames class com.example.api.CrmDealDto
-if class com.example.api.CrmDealDto
-keep class com.example.api.CrmDealDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
