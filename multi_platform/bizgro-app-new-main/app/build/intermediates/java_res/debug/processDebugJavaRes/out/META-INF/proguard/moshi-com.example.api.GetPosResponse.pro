-keepnames class com.example.api.GetPosResponse
-if class com.example.api.GetPosResponse
-keep class com.example.api.GetPosResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
