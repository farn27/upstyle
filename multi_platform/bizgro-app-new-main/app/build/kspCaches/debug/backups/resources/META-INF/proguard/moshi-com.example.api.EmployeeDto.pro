-keepnames class com.example.api.EmployeeDto
-if class com.example.api.EmployeeDto
-keep class com.example.api.EmployeeDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
