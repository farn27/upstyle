-keepnames class com.example.api.GetBusinessResponse
-if class com.example.api.GetBusinessResponse
-keep class com.example.api.GetBusinessResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
