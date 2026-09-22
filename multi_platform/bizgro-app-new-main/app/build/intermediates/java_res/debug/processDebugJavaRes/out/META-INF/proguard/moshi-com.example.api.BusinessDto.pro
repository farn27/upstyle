-keepnames class com.example.api.BusinessDto
-if class com.example.api.BusinessDto
-keep class com.example.api.BusinessDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
