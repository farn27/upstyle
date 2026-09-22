-keepnames class com.example.api.ScmDataDto
-if class com.example.api.ScmDataDto
-keep class com.example.api.ScmDataDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
