import { Component } from '@angular/core';
import { NgZorroModule } from '../../../shared/ng-zorro.module';
import { CommonModule } from '@angular/common';
import { FormsModule, NonNullableFormBuilder } from '@angular/forms';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { AppointmentService } from '../../appointment.service';

interface RiskLevel {
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgZorroModule, CommonModule, FormsModule, NzModalModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  constructor(
    private modal: NzModalService,
    private appointmentService: AppointmentService,
    private fb: NonNullableFormBuilder
  ) { }

  ngOnInit(): void {
    this.loadQueueLimits();
    this.loadAppointmentCounts();
    this.loadRiskLevelData(); // โหลดข้อมูลระดับความเสี่ยงในแต่ละเดือน
  }

  newLeads = 205;
  totalSales = 4021;
  totalOrders = 80;
  totalExpenses = 120;

  isEditingHealth = false;
  isEditingHiv = false;
  isEditingQuitSmoking = false;

  healthCheckValue = 1;
  hivCheckValue = 1;
  quitSmokingCheckValue = 1;

  // ตัวแปรสำหรับนับจำนวนการนัดหมายแต่ละประเภท
  healthCheckCount: number = 0;
  hivCheckCount: number = 0;
  quitSmokingCount: number = 0;
  totalCheckCount: number = 0;

  // ตัวแปรสำหรับแสดงข้อมูล Pie Chart
  appointmentPieChartData = [
    { name: 'ตรวจสุขภาพ', value: this.healthCheckCount },
    { name: 'HIV', value: this.hivCheckCount },
    { name: 'เลิกบุหรี่', value: this.quitSmokingCount }
  ];

  // ข้อมูลสำหรับแสดง Bar Chart
  riskLevelData: { name: string; series: { name: string; value: number; }[] }[] = [];  // กำหนดชนิดข้อมูลให้ชัดเจน

  toggleEdit(type: string) {
    if (type === 'health') {
      this.isEditingHealth = !this.isEditingHealth;
      if (!this.isEditingHealth) {
        this.saveQueueLimit('ตรวจสุขภาพ', this.healthCheckValue);
      }
    } else if (type === 'hiv') {
      this.isEditingHiv = !this.isEditingHiv;
      if (!this.isEditingHiv) {
        this.saveQueueLimit('HIV', this.hivCheckValue);
      }
    } else if (type === 'quitSmoking') {
      this.isEditingQuitSmoking = !this.isEditingQuitSmoking;
      if (!this.isEditingQuitSmoking) {
        this.saveQueueLimit('เลิกบุหรี่', this.quitSmokingCheckValue);
      }
    }
  }

  saveQueueLimit(programName: string, maxQueue: number): void {
    this.appointmentService.updateQueueLimit(programName, maxQueue).subscribe(
      () => {
        console.log(`Queue limit for ${programName} updated successfully.`);
      },
      (error) => {
        console.error(`Error updating queue limit for ${programName}:`, error);
      }
    );
  }

  loadQueueLimits(): void {
    this.appointmentService.getQueueLimits().subscribe(
      (data) => {
        data.forEach((item: any) => {
          if (item.program_name === 'ตรวจสุขภาพ') {
            this.healthCheckValue = item.max_queue;
          } else if (item.program_name === 'HIV') {
            this.hivCheckValue = item.max_queue;
          } else if (item.program_name === 'เลิกบุหรี่') {
            this.quitSmokingCheckValue = item.max_queue;
          }
        });
      },
      (error) => {
        console.error('Error loading queue limits:', error);
      }
    );
  }

  // โหลดจำนวนผู้เข้าตรวจในแต่ละประเภทและจำนวนทั้งหมด
  loadAppointmentCounts(): void {
    this.appointmentService.getConfirmedAppointments().subscribe(
      (appointments) => {
        // นับจำนวนผู้เข้าตรวจตามประเภท
        this.healthCheckCount = appointments.filter(app => app.program_name === 'ตรวจสุขภาพ').length;
        this.hivCheckCount = appointments.filter(app => app.program_name === 'HIV').length;
        this.quitSmokingCount = appointments.filter(app => app.program_name === 'เลิกบุหรี่').length;
        this.totalCheckCount = appointments.length; // จำนวนทั้งหมด

        // อัปเดตข้อมูล Pie Chart
        this.appointmentPieChartData = [
          { name: 'ตรวจสุขภาพ', value: this.healthCheckCount },
          { name: 'HIV', value: this.hivCheckCount },
          { name: 'เลิกบุหรี่', value: this.quitSmokingCount }
        ];
      },
      (error) => {
        console.error('Error loading appointments:', error);
      }
    );
  }

  // โหลดข้อมูล Bar Chart เกี่ยวกับระดับความเสี่ยงในแต่ละเดือน
  loadRiskLevelData(): void {
    this.appointmentService.getConfirmedAppointments().subscribe(
      (appointments) => {
        const riskLevelsByMonth: { [key: string]: RiskLevel } = {};  // กำหนดชนิดข้อมูลที่ชัดเจน

        // จัดกลุ่มการนัดหมายตามเดือนและระดับความเสี่ยง
        appointments.forEach(appointment => {
          const month = new Date(appointment.appointment_date).toLocaleString('default', { month: 'short' });

          if (!riskLevelsByMonth[month]) {
            riskLevelsByMonth[month] = {
              highRisk: 0,
              mediumRisk: 0,
              lowRisk: 0
            };
          }

          if (appointment.result_program === 'เสี่ยงสูง') {
            riskLevelsByMonth[month].highRisk++;
          } else if (appointment.result_program === 'เสี่ยงปานกลาง') {
            riskLevelsByMonth[month].mediumRisk++;
          } else if (appointment.result_program === 'ติดบุหรี่' || appointment.result_program === 'เสี่ยงต่ำ') {
            riskLevelsByMonth[month].lowRisk++;
          }
        });

        // สร้างข้อมูลสำหรับ Bar Chart
        this.riskLevelData = Object.keys(riskLevelsByMonth).map(month => ({
          name: month,
          series: [
            { name: 'เสี่ยงสูง', value: riskLevelsByMonth[month].highRisk },
            { name: 'เสี่ยงปานกลาง', value: riskLevelsByMonth[month].mediumRisk },
            { name: 'เสี่ยงน้อย', value: riskLevelsByMonth[month].lowRisk }
          ]
        }));
      },
      (error) => {
        console.error('Error loading risk level data:', error);
      }
    );
  }
}
