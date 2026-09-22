-keepnames class com.example.api.AddEmployeeRequest
-if class com.example.api.AddEmployeeRequest
-keep class com.example.api.AddEmployeeRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.AddEmployeeRequest
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.AddEmployeeRequest {
    public synthetic <init>(java.lang.String,com.example.api.EmployeeDto,int,kotlin.jvm.internal.DefaultConstructorMarker);
}
