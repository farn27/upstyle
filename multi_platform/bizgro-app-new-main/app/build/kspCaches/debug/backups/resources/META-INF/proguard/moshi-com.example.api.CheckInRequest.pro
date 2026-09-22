-keepnames class com.example.api.CheckInRequest
-if class com.example.api.CheckInRequest
-keep class com.example.api.CheckInRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.CheckInRequest
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.CheckInRequest {
    public synthetic <init>(java.lang.String,int,int,java.lang.String,java.lang.String,int,kotlin.jvm.internal.DefaultConstructorMarker);
}
