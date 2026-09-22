-keepnames class com.example.api.PosDataDto
-if class com.example.api.PosDataDto
-keep class com.example.api.PosDataDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
