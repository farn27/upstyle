-keepnames class com.example.api.GetScmResponse
-if class com.example.api.GetScmResponse
-keep class com.example.api.GetScmResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
