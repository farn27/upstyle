-keepnames class com.example.api.GenerateContentResponse
-if class com.example.api.GenerateContentResponse
-keep class com.example.api.GenerateContentResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
