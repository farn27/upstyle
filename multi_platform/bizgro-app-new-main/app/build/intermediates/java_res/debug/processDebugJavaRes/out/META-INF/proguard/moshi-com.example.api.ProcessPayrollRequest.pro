-keepnames class com.example.api.ProcessPayrollRequest
-if class com.example.api.ProcessPayrollRequest
-keep class com.example.api.ProcessPayrollRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.ProcessPayrollRequest
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.ProcessPayrollRequest {
    public synthetic <init>(java.lang.String,com.example.api.PayrollDto,int,kotlin.jvm.internal.DefaultConstructorMarker);
}
