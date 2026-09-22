-keepnames class com.example.api.AttendanceDto
-if class com.example.api.AttendanceDto
-keep class com.example.api.AttendanceDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
