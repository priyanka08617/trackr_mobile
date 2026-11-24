# src Folder Structure

```text
Folder PATH listing
Volume serial number is 2A89-FF7F
C:\XAMPP\HTDOCS\MOBILE_APP\TRACKR_MOBILE\SRC
|   global.css
|   
+---app
|   |   company.tsx
|   |   forgot_password.tsx
|   |   index.tsx
|   |   login.tsx
|   |   reset_password.tsx
|   |   verify_otp.tsx
|   |   _layout.tsx
|   |   
|   +---area_manager
|   |       all_register.tsx
|   |       all_void.tsx
|   |       company_faq.tsx
|   |       dashboard.tsx
|   |       fascia_plan.tsx
|   |       festive_checklist.tsx
|   |       ho_checklist.tsx
|   |       rm_checklist.tsx
|   |       rm_checklist_details.tsx
|   |       rm_checklist_form.tsx
|   |       settings.tsx
|   |       test.tsx
|   |       work_plan_travel_plan.tsx
|   |       _layout.tsx
|   |       
|   \---common
|           all_portals_library.tsx
|           all_register.tsx
|           all_stores_contacts.tsx
|           all_tracker.tsx
|           company_faq.tsx
|           dump_report.tsx
|           escalation_matrix.tsx
|           fascia_report.tsx
|           festive_checklist_report.tsx
|           home.tsx
|           library_of_important_guidelines.tsx
|           monthly_lp_global_count.tsx
|           omni_return.tsx
|           profile.tsx
|           report_bank.tsx
|           sopCommandments.tsx
|           _layout.tsx
|           
+---components
|   |   ActionCard.tsx
|   |   ActionRow.tsx
|   |   AppButton.tsx
|   |   AppHeader.tsx
|   |   AppInput.tsx
|   |   AppLoader.tsx
|   |   AreaHeaderBackContext.ts
|   |   AreaIcon.tsx
|   |   AreaLayout.tsx
|   |   AreaPage.tsx
|   |   DateField.tsx
|   |   SearchSelect.tsx
|   |   SelectField.tsx
|   |   Table.tsx
|   |   themed-text.tsx
|   |   themed-view.tsx
|   |   
|   \---table
|           DynamicAutoDataTable.tsx
|           TableColumnFilter.tsx
|           TablePagination.tsx
|           TableSearch.tsx
|           
+---constants
|       config.ts
|       theme.ts
|       
+---hooks
|       use-color-scheme.ts
|       use-color-scheme.web.ts
|       use-theme.ts
|       
+---modules
|   +---area_manager
|   |   +---screens
|   |   |       AllRegister.tsx
|   |   |       All_void.tsx
|   |   |       ChecklistDetails.tsx
|   |   |       ChecklistDialog.tsx
|   |   |       ChecklistForm.tsx
|   |   |       ChecklistList.tsx
|   |   |       CompanyFaq.tsx
|   |   |       DataContext.tsx
|   |   |       FasciaPlanScreen.tsx
|   |   |       FasciaTable.tsx
|   |   |       FestiveChecklist.tsx
|   |   |       FestiveRoute.tsx
|   |   |       HoChecklistScreen.tsx
|   |   |       LocationPicker.tsx
|   |   |       PlanForm.tsx
|   |   |       RegisterReportScreen.tsx
|   |   |       Settings.tsx
|   |   |       useRmChecklistData.ts
|   |   |       WorkPlanScreen.tsx
|   |   |       WorkPlanTable.tsx
|   |   |       
|   |   +---services
|   |   |       All_void_service.ts
|   |   |       ChecklistService.ts
|   |   |       companyFaqService.ts
|   |   |       FasciaService.ts
|   |   |       FestiveChecklistService.ts
|   |   |       HoService.ts
|   |   |       model.ts
|   |   |       
|   |   \---types
|   |           companyFaq.types.ts
|   |           
|   +---common
|   |   +---screens
|   |   |       All_portals_library.tsx
|   |   |       All_stores_contacts.tsx
|   |   |       CompanyFaq.tsx
|   |   |       Dashboard.tsx
|   |   |       EscalationMatrix.tsx
|   |   |       Home.tsx
|   |   |       Home_backup.tsx
|   |   |       Library_of_important_guidelines.tsx
|   |   |       Omni_return.tsx
|   |   |       Profile.tsx
|   |   |       ReportBankRoute.tsx
|   |   |       ReportRoute.tsx
|   |   |       Reports.tsx
|   |   |       Report_bank.tsx
|   |   |       SopCommandments.tsx
|   |   |       
|   |   \---services
|   |           All_portals_library_service.ts
|   |           All_stores_contacts.ts
|   |           DashboardService.ts
|   |           EscalationMatrixService.ts
|   |           library_of_important_guidelines_service.ts
|   |           OmniReturnService.ts
|   |           profileService.ts
|   |           ReportBankService.ts
|   |           reportCsv.ts
|   |           ReportDownloadService.ts
|   |           report_bank_service.ts
|   |           SopCommandmentsService.ts
|   |           trackerText.ts
|   |           
|   \---report
|       +---screens
|       |       AllRegister.tsx
|       |       AllTrackers.tsx
|       |       FasciaReportScreen.tsx
|       |       FasciaReportScreen_old2.tsx
|       |       FestiveHomeRoute.tsx
|       |       MonthlyLpGlobalCount.tsx
|       |       RegisterReportScreen.tsx
|       |       RegisterReportScreen_old.tsx
|       |       
|       \---services
|               AllTrackersService.ts
|               AreaHeaderBackContext.ts
|               FestiveHomeService.ts
|               locationFilters.ts
|               reportCsv.ts
|               reportDateRange.ts
|               ReportService.ts
|               reportTableColumns.ts
|               reportTableFormat.ts
|               service.ts
|               StoresService.ts
|               trackerText.ts
|               usePagination.ts
|               
+---services
|       apiService.ts
|       authService.ts
|       companyService.ts
|       dashboardService.ts
|       UserProfileService.ts
|       userService.ts
|       
+---storage
|       authStorage.ts
|       companyStorage.ts
|       userStorage.ts
|       
\---utils
        dateUtils.ts
        helpers.ts
        validation.ts
```
