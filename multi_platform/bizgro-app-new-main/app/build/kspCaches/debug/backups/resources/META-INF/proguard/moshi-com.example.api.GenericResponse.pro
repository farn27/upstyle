-keepnames class com.example.api.GenericResponse
-if class com.example.api.GenericResponse
-keep class com.example.api.GenericResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
